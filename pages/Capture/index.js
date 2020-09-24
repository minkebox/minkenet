const MacAddress = require('macaddress');
const PCap = require('pcap');
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
const CAPTURE_SNAP_LENGTH = 10240; // Allow for jumbo

const hex = (v) => {
  return `0${v.toString(16)}`.substr(-2);
}

Handlebars.registerHelper({
  hex: function(v) {
    const r = `${v.toString(16)}`;
    return '0x' + `00000000${r}`.substr(-2*Math.ceil(r.length / 2));
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
  }
});

class Capture extends Page {

  constructor(send) {
    super(send);
    this.state = {
      devices: [],
      topologyValid: false,
      ignoreBroadcast: true,
      ignoreMulticast: true,
      ignoreHost: true
    };
    this.eaddr = [];
    const ifaces = MacAddress.networkInterfaces();
    for (let dev in CAPTURE_DEVICES) {
      if (ifaces[dev]) {
        this.device = dev;
        break;
      }
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
  }

  updateState() {
    this.state.devices = DeviceInstanceManager.getCaptureDevices();
    this.state.topologyValid = TopologyManager.valid;
  }

  async startCapture() {
    if (this.session) {
      this.stopCapture();
    }
    const filter = await this.buildFilter();
    Log('startCapture: filter: ', filter);
    this.session = PCap.createSession(this.device, {
      filter: filter,
      promiscuous: true,
      monitor: false,
      buffer_size: CAPTURE_BUFFER_SIZE,
      buffer_timeout: CAPTURE_BUFFER_TIMEOUT,
      snap_length: CAPTURE_SNAP_LENGTH
    });
    this.session.on('packet', this.onPacket);
  }

  onPacket(raw) {
    if (raw.link_type !== 'LINKTYPE_ETHERNET') {
      return;
    }
    this.packet(raw, this._render('Proto', PCap.decode.packet(raw)));
  }

  async stopCapture() {
    if (this.session) {
      this.session.off('packet', this.onPacket);
      this.session.close();
      this.session = null;
    }
  }

  async buildFilter() {
    const filter = [];
    if (this.state.ignoreBroadcast) {
      filter.push('(not ether broadcast)');
    }
    if (this.state.ignoreMulticast) {
      filter.push('(not ether multicast)');
    }
    if (this.state.ignoreHost) {
      await this._getMacAddress();
      this.eaddr.forEach(mac => {
        filter.push(`(not ether host ${mac})`);
      });
    }
    //console.log(filter);
    return filter.join(' and ');
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
    if (this.session) {
      await this.stopCapture();
    }
    else {
      await this.startCapture();
    }
  }

  async 'capture.stop' (msg) {
    this.stopCapture();
  }

  async 'select.packet' (msg) {
    const raw = JSON.parse(msg.value);
    const packet = PCap.decode.packet({
      link_type: 'LINKTYPE_ETHERNET',
      header: Buffer.from(raw.h, 'latin1'),
      buf: Buffer.from(raw.b, 'latin1')
    });
    this.inspect(this._render('Full', packet));
  }

  _render(style, packet) {
    const ether = packet.payload;
    switch (ether.ethertype) {
      case 0x0800: // IPv4
        const ip4 = ether.payload;
        switch (ip4.protocol) {
          case 1: // ICMP
          case 2: // IGMP
            break;
          case 6: // TCP
            return Template[`Capture${style}Tcp`](packet);
          case 17: // UDP
            if (packet.payload.payload.payload.sport === 53 || packet.payload.payload.payload.dport === 53) {
              return Template[`Capture${style}DNS`](packet);
            }
            if (packet.payload.payload.daddr.toString() === '224.0.0.251' || packet.payload.payload.saddr.toString() == '224.0.0.251') {
              return Template[`Capture${style}DNS`](packet);
            }
            return Template[`Capture${style}Udp`](packet);
          default:
            break;
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
