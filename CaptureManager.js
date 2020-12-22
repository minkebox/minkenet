const EventEmitter = require('events');
const MacAddress = require('macaddress');
const PCap = require('pcap');
const DeviceInstanceManager = require('./DeviceInstanceManager');
const TopologyManager = require('./TopologyManager');
const ClientManager = require('./ClientManager');
const ConfigDB = require('./Config');
const Log = require('debug')('capture');

const CAPTURE_DEFAULT_DEVICE = 'eth0';
const CAPTURE_BUFFER_SIZE = 1024 * 1024; // 1MB
const CAPTURE_BUFFER_TIMEOUT = 0; // Immediate delivery
const CAPTURE_DEFAULT_SNAP_SIZE = 2000; // Reasonable default size if we can't work this out


class CaptureManager extends EventEmitter {

  constructor() {
    super();
    this.mirrors = [];
    this.restores = [];
    this.eaddr = [];
    this.session = null;

    this._onPacket = this._onPacket.bind(this);

    this._updateMacAddresses();
  }

  async startCapture(config) {
    Log('startCapture:');
    if (this.session) {
      throw new Error('capture already started');
    }
    const snapsize = parseInt(config.targetDevice.readKV(`network.physical.port.${config.targetPortNr}.framesize`) || CAPTURE_DEFAULT_SNAP_SIZE);

    const filter = this._buildFilter(config.filter);
    Log('startCapture: filter: ', filter);

    await this._updateMacAddresses();
    this._findCapturePoint();
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

  async stopCapture() {
    Log('stopCapture:');
    if (this.session) {
      this.session.off('packet', this._onPacket);
      this.session.close();
      this.session = null;
    }
    await this._deactivateMirrors();
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
      this.eaddr.forEach(entry => {
        filter.push(`(not ether host ${entry.mac})`);
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
    this.eaddr.forEach(entry => {
      filter.push(`(not (ether host ${entry.mac} and ip proto \\tcp and port ${global.WEBPORT}))`);
    });

    return filter.join(' and ');
  }

  _onPacket(raw) {
    if (raw.link_type === 'LINKTYPE_ETHERNET') {
      this.emit('packet', raw);
    }
  }

  async _updateMacAddresses() {
    return new Promise(resolve => {
      MacAddress.all((err, ifaces) => {
        if (!err) {
          this.eaddr = [];
          for (let name in ifaces) {
            const mac = ifaces[name].mac;
            if (mac) {
              this.eaddr.push({ name: name, mac: mac });
            }
          }
        }
        resolve();
      });
    });
  }

  _calculateMirrors(config) {
    this.mirrors = [];

    if (!this.attach) {
      Log('_calculateMirrors: no attachment port:');
      throw new Error('no attachment port');
    }
    if (!config.targetDevice) {
      Log('_calculateMirrors: no target device');
      throw new Error('no device');
    }

    // Find the path between the attachment point and the port we want to capture.
    const path = TopologyManager.findPath(config.targetDevice, this.attach.entryDevice);
    if (!path) {
      Log('_calculateMirrors: cannot build mirrors');
      throw new Error('no mirrors possible');
    }

    // Convert path into a set of mirrors
    let current = { device: config.targetDevice, port: config.targetPortNr };
    for (let i = 0; i < path.length; i++) {
      const link = path[i];
      const exit = link[0];
      if (current.device != exit.device) {
        Log(`_calculateMirrors: bad link: ${current.device._id} - ${exit.device._id}`);
        throw new Error('bad link');
      }
      this.mirrors.push({ device: current.device, source: current.port, target: exit.port });
      current = link[1];
    }
    if (current.device != this.attach.entryDevice) {
      Log(`_calculateMirrors: bad link to attach: ${current.device.name} - ${this.attach.entryDevice.name}`);
      throw new Error('bad link to attach');
    }
    this.mirrors.push({ device: this.attach.entryDevice, source: current.port, target: this.attach.entryPortnr });

    Log('_calculateMirrors: mirrors:', this.mirrors.map(m => [{ device: m.device.name, source: m.source, target: m.target }][0]));
  }

  async _activateMirrors() {
    // Create chain of mirrors, keeping a record of what the there before so we can restore it later
    this.restores = [];
    let first = true;
    for (let i = 0; i < this.mirrors.length; i++) {
      const mirror = this.mirrors[i];
      if (mirror.source !== mirror.target) {
        const current = mirror.device.readKV(`network.mirror.0`);
        this.restores.push({ device: mirror.device, mirror: current });
        mirror.device.writeKV('network.mirror.0',
        {
          enable: true,
          target: mirror.target,
          port: {
            [mirror.source]: first ? { egress: true, ingress: true } : { ingress: true }
          }
        }, { replace: true });
        first = false;
      }
    }
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

  _findCapturePoint() {
    Log('findCapturePoint:');
    this.attach = null;
    const device = ConfigDB.read('network.capture.device') || CAPTURE_DEFAULT_DEVICE;
    Log('findCapturePort: device:', device);
    const entry = this.eaddr.find(entry => entry.name === device);
    Log('findCapturePort: entry:', entry);
    if (entry) {
      const client = ClientManager.getClientByMac(entry.mac);
      if (client && client.connected && client.connected.portnr !== null) {
        this.attach = {
          captureDevice: device,
          entryDevice: client.connected.device,
          entryPortnr: client.connected.portnr
        };
        Log('findCapturePoint: attach:', this.attach.captureDevice, this.attach.entryDevice.name, this.attach.entryPortnr);
        return;
      }
    }
    Log('findCapturePoint: no capture point:');
    throw new Error('no capture point');
  }

}

module.exports = new CaptureManager();
