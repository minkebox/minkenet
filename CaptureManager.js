const EventEmitter = require('events');
const ChildProcess = require('child_process');
const MacAddress = require('macaddress');
const PCap = require('pcap');
const DeviceInstanceManager = require('./DeviceInstanceManager');
const TopologyManager = require('./TopologyManager');
const ClientManager = require('./ClientManager');
const ConfigDB = require('./Config');
const Apps = require('./utils/HelperApps');
const Log = require('debug')('capture');

const CAPTURE_DEFAULT_DEVICE = 'eth0';
const CAPTURE_BUFFER_SIZE = 1024 * 1024; // 1MB
const CAPTURE_BUFFER_TIMEOUT = 0; // Immediate delivery
const CAPTURE_DEFAULT_SNAP_SIZE = 2000; // Reasonable default size if we can't work this out
const ACTIVATE_INTERVAL = 60 * 1000; // 1 minute


class CaptureManager extends EventEmitter {

  constructor() {
    super();
    this.mirrors = [];
    this.restores = [];
    this.mymacs = [];
    this.session = null;
    this.running = false;

    this._onPacket = this._onPacket.bind(this);
  }

  async start() {
    this.activateCapturePoint();
  }

  stop() {
  }

  async startCapture(config) {
    Log('startCapture:');
    try {
      this.running = true;

      if (this.session) {
        throw new Error('capture already started');
      }
      if (!this.attach) {
        throw new Error('no attachment point found');
      }
      const snapsize = parseInt(this.attach.entryDevice.readKV(`network.physical.port.${this.attach.entryPortnr}.framesize`) || CAPTURE_DEFAULT_SNAP_SIZE);

      const filter = this._buildFilter(config.filter);
      Log('startCapture: filter: ', filter);

      this._calculateMirrors(config);
      await this._activateMirrors();

      Log('startCapture: createSession:');
      this.session = PCap.createSession(this.attach.captureDevice, {
        filter: filter,
        promiscuous: true,
        monitor: false,
        buffer_size: CAPTURE_BUFFER_SIZE,
        buffer_timeout: CAPTURE_BUFFER_TIMEOUT,
        snap_length: snapsize
      });
      this.session.on('packet', this._onPacket);
    }
    catch (e) {
      this.running = false;
      throw e;
    }
  }

  async stopCapture() {
    Log('stopCapture:');
    if (!this.running) {
      return;
    }
    try {
      if (this.session) {
        this.session.off('packet', this._onPacket);
        this.session.close();
        this.session = null;
      }
      await this._deactivateMirrors();
    }
    finally {
      this.running = false;
    }
  }

  _buildFilter(config) {
    const filter = [];

    if (config.ignoreBroadcast) {
      filter.push('(not ether broadcast)');
    }
    if (config.ignoreMulticast) {
      filter.push('(not ether multicast)');
    }
    if (config.ignoreHost) {
      this.mymacs.forEach(mac => {
        filter.push(`(not ether host ${mac})`);
      });
    }

    if (config.host) {
      switch (config.hostType) {
        case 'S':
          filter.push(`(src host ${config.host})`);
          break;
        case 'D':
          filter.push(`(dst host ${config.host})`);
          break;
        case 'SD':
          filter.push(`(host ${config.host})`);
          break;
        default:
          break;
      }
    }

    switch (config.proto) {
      case 'ICMP':
        filter.push(`(ip proto \\icmp)`);
        break;
      case 'UDP':
        filter.push(`(ip proto \\udp)`);
        break;
      case 'TCP':
        filter.push(`(ip proto \\tcp)`);
        break;
      case 'ARP':
        filter.push(`(ether proto \\arp)`);
        break;
    }

    if (config.port) {
      switch (config.proto) {
        case '':
        case 'UDP':
        case 'TCP':
          switch (config.portType) {
            case 'S':
              filter.push(`(src port ${config.port})`);
              break;
            case 'D':
              filter.push(`(dst port ${config.port})`);
              break;
            case 'SD':
              filter.push(`(port ${config.port})`);
              break;
            default:
              break;
          }
          break;
        default:
          break;
        }
    }

    if (config.freeform) {
      filter.push(`(${config.freeform})`);
    }

    // Filter traffic from this application
    this.mymacs.forEach(mac => {
      filter.push(`(not (ether host ${mac} and ip proto \\tcp and port ${global.WEBPORT}))`);
    });

    return filter.join(' and ');
  }

  _onPacket(raw) {
    if (raw.link_type === 'LINKTYPE_ETHERNET') {
      this.emit('packet', raw);
    }
  }

  _calculateMirrors(config) {

    if (!this.attach) {
      Log('_calculateMirrors: no attachment port:');
      throw new Error('no attachment port');
    }
    if (!config.points || !config.points.length) {
      Log('_calculateMirrors: no target points');
      throw new Error('no points');
    }

    const mirrors = {};
    config.points.forEach(point => {

      // Find the path between the attachment point and the port we want to capture.
      const path = TopologyManager.findPath(point.device, this.attach.entryDevice);
      if (!path) {
        Log('_calculateMirrors: cannot build mirrors');
        throw new Error('no mirrors possible');
      }
      // Add the attach point to the end of the path
      path.push([ { device: this.attach.entryDevice, port: this.attach.entryPortnr }, {} ]);

      // Convert path into a set of mirrors
      let current = { device: point.device, port: point.portnr };
      for (let i = 0; i < path.length; i++) {
        const mirror = mirrors[current.device._id] || (mirrors[current.device._id] = { device: current.device, sources: [], target: null });
        if (mirror.target === null || mirror.target === path[i][0].port) {
          mirror.target = path[i][0].port;
          mirror.sources.push(current.port);
        }
        else {
          throw new Error('impossible mirrors');
        }
        current = path[i][1];
      }
    });
    this.mirrors = Object.values(mirrors);

    Log('_calculateMirrors: mirrors:', this.mirrors.map(m => [{ device: m.device.name, sources: m.sources, target: m.target }][0]));
  }

  async _activateMirrors() {
    // Create chain of mirrors, keeping a record of what the there before so we can restore it later
    this.restores = [];
    // If we're mirroring traffic through multiple switches, we can only capture the ingress traffic (the traffic entering
    // the port at the end of the mirror chain). While we can set the end mirror to also mirror the egress traffic, when this
    // enters the next switch in the chain, it will look at the source ethernet address and think the associated device has moved
    // somewhere else in the network (it can't know the traffic is *special*). This will cause all kinds of problems resulting in
    // the network failing.
    this.mirrors.forEach(mirror => {
      this.restores.push({ device: mirror.device, mirror: mirror.device.readKV(`network.mirror.0`) });
      const ports = {};
      mirror.sources.forEach(portnr => ports[portnr] = { ingress: true });
      mirror.device.writeKV('network.mirror.0',
      {
        enable: true,
        target: mirror.target,
        port: ports
      }, { replace: true });
    });
    // Activate mirrors from furthest to nearest. Some devices might become difficult to access when mirroring
    // is happening on nodes between outselves and them (I'm not sure that it should, as tcp should deal with duplicate
    // packets but some switches clearly have issues with this).
    await DeviceInstanceManager.commit({ direction: 'far-to-near', preconnect: true });
  }

  async _deactivateMirrors() {
    if (!this.restores.length) {
      return;
    }
    for (let i = 0; i < this.restores.length; i++) {
      const restore = this.restores[i];
      restore.device.writeKV('network.mirror.0', restore.mirror, { replace: true });
    }
    this.restores = [];
    // Tear down mirrors starting with the nearest first. We don't preconnect because mirrors can
    // effect our ability to contact some switches (I'm not sure why).
    await DeviceInstanceManager.commit({ direction: 'near-to-far', preconnect: false });
  }

  async activateCapturePoint() {
    for (;;) {
      Log('activateCapturePoint:');
      const device = ConfigDB.read('network.capture.device') || CAPTURE_DEFAULT_DEVICE;
      try {
        ChildProcess.execSync(`${Apps.ip} link set ${device} up`);
        const dmac = await MacAddress.one(device);

        // Look for the capture point in the network
        const client = ClientManager.getClientByMac(dmac);
        if (client && client.connected && client.connected.portnr !== null) {
          this.attach = {
            captureDevice: device,
            entryDevice: client.connected.device,
            entryPortnr: client.connected.portnr
          };
          Log('activateCapturePoint: attach:', this.attach.captureDevice, this.attach.entryDevice.name, this.attach.entryPortnr);
        }
        else {
          this.attach = null;
          Log('activateCapturePoint: no capture point:', device);
        }

        // Update list of my mac addresses
        this.mymacs = Object.values(await MacAddress.all()).map(entry => entry.mac);

        // Send a packet out of the capture point so we can locate it in the network.
        // We do this periodically to keep point alive in the network.
        const mac = dmac.split(':').map(v => parseInt(v, 16));
        const pkt = Buffer.from([
          0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
          mac[0], mac[1], mac[2], mac[3], mac[4], mac[5], // My mac
          0x08, 0x06, // ARP
          0x08, 0x00, // Ethernet,
          0x00, 0x04, // IPv4
          6, // HW len
          4, // Protocol len
          0, 1, // Request
          mac[0], mac[1], mac[2], mac[3], mac[4], mac[5], // My mac
          0, 0, 0, 0, // My IP - 0.0.0.0 as placeholder
          0, 0, 0, 0, 0, 0, // Target HW
          0, 0, 0, 0 // Target IP
        ]);

        let session;
        try {
          session = PCap.createSession(device, {
            promiscuous: false,
            monitor: false,
            buffer_size: CAPTURE_BUFFER_SIZE,
            snap_length: CAPTURE_DEFAULT_SNAP_SIZE
          });
          session.inject(pkt);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        finally {
          if (session) {
            session.close();
          }
        }

        // If we don't have the attachment point, sync the state from our capture-able devices
        // so we can find it.
        if (!this.attach) {
          TopologyManager.getCaptureDevices().forEach(dev => {
            dev.watch();
            dev.unwatch();
          });
        }
      }
      catch (_) {
        Log(_);
      }
      await new Promise(resolve => setTimeout(resolve, ACTIVATE_INTERVAL));
    }
  }

}

module.exports = new CaptureManager();
