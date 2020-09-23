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
  }
});

class Capture extends Page {

  constructor(send) {
    super(send);
    this.device = CAPTURE_DEVICE;
    this.state = {
      devices: [],
      topologyValid: false
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

  startCapture() {
    if (this.session) {
      this.stopCapture();
    }
    this.session = PCap.createSession(this.device, {
      filter: this.buildFilter(),
      promiscuous: true,
      monitor: false,
      buffer_size: CAPTURE_BUFFER_SIZE,
      buffer_timeout: CAPTURE_BUFFER_TIMEOUT,
      snap_length: CAPTURE_SNAP_LENGTH
    });
    this.session.on('packet', raw => {
      const packet = PCap.decode.packet(raw);
      if (packet.link_type !== 'LINKTYPE_ETHERNET') {
        return;
      }
      console.log(packet);
      const ether = packet.payload;
      switch (ether.ethertype) {
        case 0x0800: // IPv4
          const ip4 = ether.payload;
          switch (ip4.protocol) {
            case 1: // ICMP
            case 2: // IGMP
            case 6: // TCP
            case 17: // UDP
            default:
              break;
          }
          break;
        case 0x0806: // ARP
          this.packet(Template.CaptureProtoArp(packet));
          break;
        case 0x86dd: // IPv6
          break;
        default:
          break;
      }
    });
  }

  stopCapture() {
    if (this.session) {
      this.session.close(); // Removes all listeners
      this.session = null;
    }
  }

  buildFilter() {
    return 'arp'
  }

  packet(text) {
    this.send('capture.packet', text);
  }

  async 'capture.start' (msg) {
    if (this.session) {
      this.stopCapture();
    }
    else {
      this.startCapture();
    }
  }

  async 'capture.stop' (msg) {
    this.stopCapture();
  }

}

module.exports = Capture;
