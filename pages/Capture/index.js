const MacAddress = require('macaddress');
const PCap = require('pcap');
const PCapDNS = require('pcap/decode/dns');
const Handlebars = require('handlebars');
const Template = require('../Template');
const Page = require('../Page');
const DeviceInstanceManager = require('../../DeviceInstanceManager');
const TopologyManager = require('../../TopologyManager');
const ClientManager = require('../../ClientManager');
const ConfigDB = require('../../Config');
const Log = require('debug')('capture');

const CAPTURE_DEFAULT_DEVICE = 'eth0';
const CAPTURE_BUFFER_SIZE = 1024 * 1024; // 1MB
const CAPTURE_BUFFER_TIMEOUT = 0; // Immediate delivery
const CAPTURE_DEFAULT_SNAP_SIZE = 2000; // Reasonable default size if we can't work this out
const MAX_BUFFER = 102400; // 100K in flight only


const hex = (v) => {
  return `0${v.toString(16)}`.substr(-2);
}
const escape = (unsafe) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

Handlebars.registerHelper({
  hex: function(v) {
    const r = `${v.toString(16)}`;
    return '0x' + `00000000${r}`.substr(-2 * Math.ceil(r.length / 2));
  },
  hexdump: function(data, offset) {
    const LINE_LENGTH = 8;
    const lines = [];
    for (let p = offset; p < data.length;) {
      let line = '';
      let ascii = '';
      for (let i = 0; i < LINE_LENGTH && p < data.length; i++, p++) {
        line += ` ${hex(data[p])}`;
        if (data[p] >= 32 && data[p] <= 126) {
          ascii += String.fromCharCode(data[p]);
        }
        else {
          ascii += '.';
        }
      }
      lines.push(`<div class="hex">${line.substring(1)}</div><div class="ascii">${escape(ascii)}</div>`);
    }
    return '<div class="line">' + lines.join('</div><div class="line">') + '</div>';
  },
  localtime: function(secs) {
    return new Date(secs * 1000).toTimeString();
  },
  etherorhost: function(addr) {
    const eth = `${hex(addr[0])}:${hex(addr[1])}:${hex(addr[2])}:${hex(addr[3])}:${hex(addr[4])}:${hex(addr[5])}`;
    if (eth === 'ff:ff:ff:ff:ff:ff') {
      return 'broadcast'
    }
    const dev = ClientManager.getClientByMac(eth);
    if (dev) {
      if (dev.name) {
        return dev.name;
      }
      if (dev.hostname) {
        return dev.hostname;
      }
    }
    return eth;
  },
  etheraddr: function(addr) {
    return `${hex(addr[0])}:${hex(addr[1])}:${hex(addr[2])}:${hex(addr[3])}:${hex(addr[4])}:${hex(addr[5])}`;
  },
  ipaddr: function(addr) {
    return `${addr[0]}.${addr[1]}.${addr[2]}.${addr[3]}`;
  },
  iporhost: function(addr) {
    const ip = `${addr[0]}.${addr[1]}.${addr[2]}.${addr[3]}`;
    const dev = ClientManager.getClientByIP(ip);
    if (dev) {
      if (dev.name) {
        return dev.name;
      }
      if (dev.hostname) {
        return dev.hostname;
      }
    }
    switch (ip) {
      case '224.0.0.251':
        return 'mDNS'
      case '239.255.255.250':
        return 'UPnP/SSDP';
      default:
        break;
    }
    return ip;
  },
  tcpflags: function(flags) {
    const r = [];
    if (flags.rst) {
      r.push('RST');
    }
    if (flags.syn) {
      r.push('SYN');
    }
    if (flags.psh) {
      r.push('PSH');
    }
    if (flags.fin) {
      r.push('FIN');
    }
    if (flags.ack) {
      r.push('ACK');
    }
    if (flags.urg) {
      r.push('URG');
    }
    if (r.length) {
      return `[${r.join(', ')}]`;
    }
    return '';
  },
  decode: function(type, data, offset) {
    switch (type) {
      case 'dns':
        return new PCapDNS().decode(data, offset, data.length);
      default:
        return null;
    }
  }
});

class Capture extends Page {

  constructor(root) {
    super(root);
    this.state = {
      devices: null,
      topologyValid: false,
      selectedDevice: null,
      selectedPortNr: null,
      selectedPortName: null,
      capture: {
        ignoreBroadcast: true,
        ignoreMulticast: true,
        ignoreHost: true
      }
    };
    this.eaddr = [];
    this.device = CAPTURE_DEFAULT_DEVICE;
    this.mirrors = [];
    this.restores = [];

    this.onUpdate = this.onUpdate.bind(this);
    this.onPacket = this.onPacket.bind(this);
  }

  select(arg) {
    super.select(arg);

    this.device = ConfigDB.read('network.capture.device') || CAPTURE_DEFAULT_DEVICE;

    DeviceInstanceManager.on('add', this.onUpdate);
    DeviceInstanceManager.on('remove', this.onUpdate);
    TopologyManager.on('update', this.onUpdate);

    if (arg) {
      this.state.selectedDevice = arg.device;
      this.state.selectedPortNr = arg.portnr;
      this.state.capture = arg.capture;
    }

    this.state.devices = null;
    this.updateState(this.state.selectedDevice, this.state.selectedPortNr);

    this.html('main-container', Template.CaptureTab(this.state));
  }

  deselect() {
    DeviceInstanceManager.off('add', this.onUpdate);
    DeviceInstanceManager.off('remove', this.onUpdate);
    TopologyManager.off('update', this.onUpdate);

    this.stopCapture();
    this.deactivateMirrors();
  }

  async startCapture() {
    if (this.session) {
      this.stopCapture();
    }
    const snapsize = parseInt(this.state.selectedDevice.readKV(`network.physical.port.${this.state.selectedPortNr}.framesize`) || CAPTURE_DEFAULT_SNAP_SIZE);
    const filter = await this.buildFilter(this.state.capture);
    Log('startCapture: filter: ', filter);
    this.session = PCap.createSession(this.device, {
      filter: filter,
      promiscuous: true,
      monitor: false,
      buffer_size: CAPTURE_BUFFER_SIZE,
      buffer_timeout: CAPTURE_BUFFER_TIMEOUT,
      snap_length: snapsize
    });
    this.session.on('packet', this.onPacket);
  }

  async stopCapture() {
    if (this.session) {
      this.session.off('packet', this.onPacket);
      this.session.close();
      this.session = null;
    }
  }

  async buildFilter(config) {
    const filter = [];
    await this._getMacAddress();

    if (config.ignoreBroadcast) {
      filter.push('(not ether broadcast)');
    }
    if (config.ignoreMulticast) {
      filter.push('(not ether multicast)');
    }
    if (config.ignoreHost) {
      this.eaddr.forEach(mac => {
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
    this.eaddr.forEach(mac => {
      filter.push(`(not (ether host ${mac} and ip proto \\tcp and port ${global.WEBPORT}))`);
    });

    return filter.join(' and ');
  }

  onPacket(raw) {
    if (raw.link_type === 'LINKTYPE_ETHERNET' && this.send.bufferedAmount() < MAX_BUFFER) {
      this.packet(raw, this._render('Proto', raw));
    }
  }

  onUpdate() {
    this.state.devices = null;
    this.updateState(null, null);
  }

  packet(raw, text) {
    if (text) {
      const data = JSON.stringify({
        h: raw.header.toString('latin1'),
        b: raw.buf.toString('latin1', 0, raw.header.readUInt32LE(12))
      });
      this.send('capture.packet', { raw: data, html: text });
    }
  }

  inspect(text) {
    if (text) {
      this.html('capture-packet', text);
    }
  }

  async 'capture.start' (msg) {
    this.activateMirrors().then(() => {
      this.send('modal.hide.all');
      this.state.capture = msg.value;
      this.startCapture();
      Log('capture started');
    });
  }

  async 'capture.stop' (msg) {
    this.stopCapture();
    this.deactivateMirrors().then(() => {
      Log('capture stopped');
    });
  }

  async 'select.packet' (msg) {
    const encoded = JSON.parse(msg.value);
    const raw = {
      link_type: 'LINKTYPE_ETHERNET',
      header: Buffer.from(encoded.h, 'latin1'),
      buf: Buffer.from(encoded.b, 'latin1')
    };
    this.inspect(this._render('Full', raw));
  }

  async 'device.port.select' (msg) {
    const device = DeviceInstanceManager.getDeviceById(msg.value.id);
    const port = parseInt(msg.value.port);
    this.updateState(device, port);
    this.html('capture-devices', Template.PortsDevices(this.state));
    this.html('capture-port', Template.CapturePort(this.state));
  }


  updateState(device, portnr) {
    this.state.selectedDevice = device;
    this.state.selectedPortNr = portnr;

    if (!this.state.devices) {
      this.state.devices = TopologyManager.getCaptureDevices();
      if (this.state.devices.indexOf(this.state.selectedDevice) === -1) {
        this.state.selectedDevice = null;
      }
    }
    this.state.topologyValid = TopologyManager.valid;

    const porthighlights = [];

    if (!this.state.selectedDevice) {
      this.state.selectedPortNr = null;
      this.state.selectedPortName = null;
      const attach = TopologyManager.getAttachmentPoint();
      if (attach) {
        this.state.selectedDevice = attach.device;
        this.state.selectedPortNr = attach.port;
      }
    }
    if (this.state.selectedDevice) {
      this.calcMirrors();
      porthighlights[this.state.selectedPortNr] = 'A';
      this.state.selectedPortName = this.state.selectedDevice.readKV(`network.physical.port.${this.state.selectedPortNr}.name`);
    }

    this.state.ports = Array(this.state.devices.length);
    this.state.ports[this.state.devices.indexOf(this.state.selectedDevice)] = porthighlights;
  }

  calcMirrors() {
    const attach = TopologyManager.getAttachmentPoint();
    if (!attach) {
      Log('no attachment port:');
      return;
    }

    // Find the path between the attachment point and the port we want to capture.
    const path = TopologyManager.findPath(this.state.selectedDevice, attach.device);

    // Convert path into a set of mirrors
    const mirrors = [];
    let current = { device: this.state.selectedDevice, port: this.state.selectedPortNr };
    for (let i = 0; i < path.length; i++) {
      const link = path[i];
      const exit = link[0];
      if (current.device != exit.device) {
        Log(`bad link: ${current.device._id} - ${exit.device._id}`);
        return;
      }
      mirrors.push({ device: current.device, source: current.port, target: exit.port });
      current = link[1];
    }
    if (current.device != attach.device) {
      Log(`bad link to attach: ${current.device._id} - ${attach.device._id}`);
      return;
    }
    // Dont need this if the attachment port the last port in the mirror list (e.g. we're monitoring ourself).
    if (current.port !== attach.port) {
      mirrors.push({ device: attach.device, source: current.port, target: attach.port });
    }

    this.mirrors = mirrors;
  }

  async activateMirrors() {
    // Create chain of mirrors, keeping a record of what the there before so we can restore it later
    this.restores = [];
    for (let i = 0; i < this.mirrors.length; i++) {
      const mirror = this.mirrors[i];
      const current = mirror.device.readKV(`network.mirror.0`);
      this.restores.push({ device: mirror.device, mirror: current });
      mirror.device.writeKV('network.mirror.0',
      {
        enable: true,
        target: mirror.target,
        port: {
          [mirror.source]: (mirror === this.mirrors[0] ? { egress: true, ingress: true } : { ingress: true })
        }
      }, { replace: true });
    }
    await DeviceInstanceManager.commit();
  }

  async deactivateMirrors() {
    this.restores.forEach(restore => {
      restore.device.writeKV('network.mirror.0', restore.mirror, { replace: true });
    });
    await DeviceInstanceManager.commit();
  }

  _render(style, raw) {
    const packet = PCap.decode.packet(raw);
    packet.raw = raw.buf;
    const ether = packet.payload;
    switch (ether.ethertype) {
      case 0x0800: // IPv4
        const ip4 = ether.payload;
        switch (ip4.protocol) {
          case 1: // ICMP
            return Template[`Capture${style}Icmp`](packet);
          case 2: // IGMP
            return Template[`Capture${style}Igmp`](packet);
          default:
            return Template[`Capture${style}IPV4Unknown`](packet);
          case 6: // TCP
            return Template[`Capture${style}Tcp`](packet);
          case 17: // UDP
            if (packet.payload.payload.payload.sport === 53 || packet.payload.payload.payload.dport === 53) {
              return Template[`Capture${style}Dns`](packet);
            }
            if (packet.payload.payload.daddr.toString() === '224.0.0.251' || packet.payload.payload.saddr.toString() == '224.0.0.251' ||
                packet.payload.payload.payload.sport === 5353 || packet.payload.payload.payload.dport === 5353) {
              return Template[`Capture${style}mDns`](packet);
            }
            return Template[`Capture${style}Udp`](packet);
        }
        break;
      case 0x0806: // ARP
        return Template[`Capture${style}Arp`](packet);
      case 0x86dd: // IPv6
        break;
      default:
        break;
    }
    return null;
  }

  async _getMacAddress() {
    if (!this.eaddr.length) {
      return new Promise(resolve => {
        MacAddress.all((err, ifaces) => {
          if (!err) {
            for (let name in ifaces) {
              const mac = ifaces[name].mac;
              if (mac) {
                this.eaddr.push(mac);
              }
            }
          }
          resolve();
        });
      });
    }
  }

}

module.exports = Capture;
