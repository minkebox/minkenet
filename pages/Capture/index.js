const MacAddress = require('macaddress');
const PCap = require('pcap');
const PCapDNS = require('pcap/decode/dns')
const Handlebars = require('handlebars');
const Template = require('../Template');
const Page = require('../Page');
const DeviceInstanceManager = require('../../DeviceInstanceManager');
const TopologyManager = require('../../TopologyManager');
const ClientManager = require('../../ClientManager');
const Log = require('debug')('capture');

const CAPTURE_DEVICES = [ 'eth0', 'br0' ];
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

  constructor(send) {
    super(send);
    this.state = {
      devices: [],
      topologyValid: false,
      selectedDevice: null,
      selectedPortNr: null
    };
    this.eaddr = [];
    const ifaces = MacAddress.networkInterfaces();
    for (let dev in CAPTURE_DEVICES) {
      if (ifaces[dev]) {
        this.device = dev;
        break;
      }
    }
    this.mirrors = [];
    this.restores = [];

    const attach = TopologyManager.getAttachmentPoint();
    if (attach) {
      this.state.selectedDevice = attach.device;
      this.state.selectedPortNr = attach.port;
    }

    this.onPacket = this.onPacket.bind(this);
  }

  select() {
    super.select();
    this.updateState();
    this.html('main-container', Template.CaptureTab(this.state));
  }

  deselect() {
    this.stopCapture();
    this.deactivateMirrors();
  }

  updateState() {
    this.state.devices = this.getCaptureDevices();
    this.state.topologyValid = TopologyManager.valid;
    const porthighlights = [];
    porthighlights[this.state.selectedPortNr] = 'A';
    this.state.ports = Array(this.state.devices.length);
    this.state.ports[this.state.devices.indexOf(this.state.selectedDevice)] = porthighlights;
  }

  async startCapture(config) {
    if (this.session) {
      this.stopCapture();
    }
    const snapsize = this.state.selectedDevice.readKV(`network.physical.port.${this.state.selectedPortNr}.framesize`) || CAPTURE_DEFAULT_SNAP_SIZE;
    const filter = await this.buildFilter(config);
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
    if (config.options.ignoreBroadcast) {
      filter.push('(not ether broadcast)');
    }
    if (config.options.ignoreMulticast) {
      filter.push('(not ether multicast)');
    }
    if (config.options.ignoreHost) {
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
      case 'UDP':
      case 'TCP':
        filter.push(`(ip proto \\${config.proto === 'UDP' ? 'udp' : 'tcp'})`);
        if (config.port) {
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
        }
        break;
      case 'ARP':
        filter.push(`(ether proto \\arp)`);
        break;
      case '':
        break;
      default:
        break;
    }

    // Filter traffic from this application
    this.eaddr.forEach(mac => {
      filter.push(`(not (ether host ${mac} and ip proto \\tcp and port 8080))`);
    });

    return filter.join(' and ');
  }

  onPacket(raw) {
    if (raw.link_type === 'LINKTYPE_ETHERNET' && this.send.bufferedAmount() < MAX_BUFFER) {
      this.packet(raw, this._render('Proto', raw));
    }
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
      this.startCapture(msg.value);
    });
  }

  async 'capture.stop' (msg) {
    this.stopCapture();
    this.deactivateMirrors();
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
    const attach = TopologyManager.getAttachmentPoint();
    if (!attach) {
      Log('no attachment port:');
      return;
    }

    // Find the path between the attachment point and the port we want to capture.
    const path = TopologyManager.findPath(device, attach.device);

    // Convert path into a set of mirrors
    const mirrors = [];
    let current = { device: device, port: port };
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
    // Dont need this is the attachment port the last port in the mirror list (e.g. we're monitoring ourself).
    if (current.port !== attach.port) {
      mirrors.push({ device: attach.device, source: current.port, target: attach.port });
    }

    this.mirrors = mirrors;
    this.state.selectedDevice = device;
    this.state.selectedPortNr = port;
    this.updateState();
    this.html('capture-devices', Template.PortsDevices(this.state));
  }

  async activateMirrors() {
    // Create chain of mirrors, keeping a record of what the there before so we can restore it later
    this.restores = [];
    this.mirrors.forEach(mirror => {
      this.restores.push({ device: mirror.device, mirror: mirror.device.readKV(`network.mirror.0`) });
      mirror.device.writeKV('network.mirror.0',
      {
        enable: true,
        target: mirror.target,
        port: {
          [mirror.source]: (mirror === this.mirrors[0] ? { egress: true, ingress: true } : { ingress: true })
        }
      }, { replace: true });
    });
    //await DeviceInstanceManager.commit();
  }

  async deactivateMirrors() {
    this.restores.forEach(restore => {
      restore.device.writeKV('network.mirror.0', restore.mirror, { replace: true });
    });
    //await DeviceInstanceManager.commit();
  }

  _render(style, raw) {
    const packet = PCap.decode.packet(raw);
    packet.raw = raw.buf;//Uint8Array.from(raw);
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
            if (packet.payload.payload.daddr.toString() === '224.0.0.251' || packet.payload.payload.saddr.toString() == '224.0.0.251') {
              return Template[`Capture${style}Dns`](packet);
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

  getCaptureDevices() {
    const attach = TopologyManager.getAttachmentPoint();
    if (!attach) {
      return [];
    }
    // Get a list of all devices capable of capture
    const devices = DeviceInstanceManager.getAllDevices();
    const caps = {};
    devices.forEach(device => {
      if (device.readKV('network.mirror', { depth: 1 })) {
        caps[device._id] = device;
      }
    });
    // Make sure there's a capturable path from the attachment point to each device.
    for (let id in caps) {
      const path = TopologyManager.findPath(attach.device, caps[id]);
      if (!path) {
        delete caps[id];
      }
      else {
        for (let i = 0; i < path.length; i++) {
          const link = path[i];
          if (!caps[link[0].device._id] || !caps[link[1].device._id]) {
            delete caps[id];
            break;
          }
        }
      }
    }
    // Return only devices we can capture from.
    return Object.values(caps);
  }

}

module.exports = Capture;
