const MacAddress = require('macaddress');
const PCap = require('pcap');
const Handlebars = require('handlebars');
const Template = require('../Template');
const Page = require('../Page');
const DeviceInstanceManager = require('../../DeviceInstanceManager');
const TopologyManager = require('../../TopologyManager');
const ClientManager = require('../../ClientManager');

const CAPTURE_DEVICE = 'br0';
const CAPTURE_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB
const CAPTURE_BUFFER_TIMEOUT = 1000; // 1 second
const CAPTURE_SNAP_LENGTH = 65535;

const hex = (v) => {
  return `0${v.toString(16)}`.substr(-2);
}

Handlebars.registerHelper({
  etheraddr: function(addr) {
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
  }
});

class Capture extends Page {

  constructor(send) {
    super(send);
    this.device = CAPTURE_DEVICE;
    this.state = {
      devices: [],
      topologyValid: false,
      ignoreBroadcast: true,
      ignoreHost: true
    };
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
    this.session = PCap.createSession(this.device, {
      filter: await this.buildFilter(),
      promiscuous: true,
      monitor: false,
      buffer_size: CAPTURE_BUFFER_SIZE,
      buffer_timeout: CAPTURE_BUFFER_TIMEOUT,
      snap_length: CAPTURE_SNAP_LENGTH
    });
    this.session.on('packet', raw => {
      if (raw.link_type !== 'LINKTYPE_ETHERNET') {
        return;
      }
      const packet = PCap.decode.packet(raw);
      //console.log(packet);
      const ether = packet.payload;
      switch (ether.ethertype) {
        case 0x0800: // IPv4
          const ip4 = ether.payload;
          switch (ip4.protocol) {
            case 1: // ICMP
            case 2: // IGMP
              break;
            case 6: // TCP
              //this.packet(raw, Template.CaptureProtoTcp(packet));
              break;
            case 17: // UDP
              if (packet.payload.payload.payload.sport === 53 || packet.payload.payload.payload.dport === 53) {
                this.packet(raw, Template.CaptureProtoDNS(packet));
              }
              else {
                this.packet(raw, Template.CaptureProtoUdp(packet));
              }
              break;
            default:
              break;
          }
          break;
        case 0x0806: // ARP
          this.packet(raw, Template.CaptureProtoArp(packet));
          break;
        case 0x86dd: // IPv6
          break;
        default:
          break;
      }
    });
  }

  async stopCapture() {
    if (this.session) {
      this.session.close(); // Removes all listeners
      this.session = null;
    }
  }

  async buildFilter() {
    const filter = [];
    if (this.state.ignoreBroadcast) {
      filter.push('(not ether broadcast)');
    }
    if (this.state.ignoreHost) {
      await this._setMacAddress();
      if (this.eaddr) {
        filter.push(`(not ether host ${this.eaddr})`);
      }
    }
    //console.log(filter);
    return filter.join(' and ');
  }

  packet(raw, text) {
    const data = JSON.stringify({
      h: raw.header.toString('latin1'),
      b: raw.buf.toString('latin1', 0, raw.header.readUInt32LE(12))
    });
    this.send('capture.packet', { raw: data, html: text });
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
    console.log(packet);
  }

  async _setMacAddress() {
    if (!this.eaddr) {
      return new Promise(resolve => {
        MacAddress.getMacAddress(this.device, (err, mac) => {
          if (!err) {
            this.eaddr = mac;
          }
          resolve();
        });
      });
    }
  }

}

module.exports = Capture;
