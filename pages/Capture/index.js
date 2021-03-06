const PCap = require('pcap');
const PCapDNS = require('pcap/decode/dns');
const Handlebars = require('handlebars');
const Template = require('../Template');
const Page = require('../Page');
const DeviceInstanceManager = require('../../DeviceInstanceManager');
const TopologyManager = require('../../TopologyManager');
const ClientManager = require('../../ClientManager');
const CaptureManager = require('../../CaptureManager');
const Log = require('debug')('capture');

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
      },
      selectedPoints: []
    };
    this.eaddr = [];
    this.attach = null;
    this.mirrors = [];
    this.restores = [];

    this.onUpdate = this.onUpdate.bind(this);
    this.onPacket = this.onPacket.bind(this);
  }

  select(arg) {
    super.select(arg);

    DeviceInstanceManager.on('add', this.onUpdate);
    DeviceInstanceManager.on('remove', this.onUpdate);
    TopologyManager.on('update', this.onUpdate);
    CaptureManager.on('packet', this.onPacket);

    this.onUpdate();

    let device = this.root.common.device;
    let portnr = this.root.common.portnr;
    if (arg) {
      device = arg.device;
      portnr = arg.portnr;
      this.state.capture = arg.capture;
    }
    if (this.state.devices.indexOf(device) === -1) {
      device = null;
      portnr = null;
    }
    this.togglePort(device, portnr);

    this.html('main-container', Template.CaptureTab(this.state));
  }

  deselect() {
    DeviceInstanceManager.off('add', this.onUpdate);
    DeviceInstanceManager.off('remove', this.onUpdate);
    TopologyManager.off('update', this.onUpdate);
    CaptureManager.off('packet', this.onPacket);

    CaptureManager.stopCapture();

    this.root.common.device = this.state.selectedDevice;
    this.root.common.portnr = this.state.selectedPortNr;
  }

  onPacket(raw) {
    if (raw.link_type === 'LINKTYPE_ETHERNET' && this.send.bufferedAmount() < MAX_BUFFER) {
      this.packet(raw, this._render('Proto', raw));
    }
  }

  onUpdate() {
    this.state.devices = TopologyManager.getCaptureDevices();
    this.state.topologyValid = TopologyManager.valid;
    this.state.selectedPoints = [];
    this.togglePort();
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

  message(text) {
    this.send('capture.packet', { html: text, force: true });
  }

  inspect(text) {
    if (text) {
      this.html('capture-packet', text);
    }
  }

  async 'capture.start' (msg) {
    (async () => {
      try {
        this.message(Template.CaptureMsgStarting());
        this.state.capture = msg.value;
        await CaptureManager.startCapture({
          points: this.state.selectedPoints,
          filter: this.state.capture
        });
        this.message(Template.CaptureMsgStarted());
      }
      catch (e) {
        Log('capture.start: error:', e);
        this.message(Template.CaptureMsgStopping());
        await CaptureManager.stopCapture();
        this.html('capture-controls', Template.CaptureControls(this.state));
        this.message(Template.CaptureMsgFail());
      }
    })();
  }

  async 'capture.stop' (msg) {
    (async () => {
      this.message(Template.CaptureMsgStopping());
      await CaptureManager.stopCapture();
      this.html('capture-controls', Template.CaptureControls(this.state));
      this.message(Template.CaptureMsgStopped());
    })();
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
    if (CaptureManager.running) {
      return;
    }
    const device = DeviceInstanceManager.getDeviceById(msg.value.id);
    const portnr = parseInt(msg.value.port);
    this.togglePort(device, portnr);
    this.html('capture-devices', Template.DeviceListAll(this.state));
    this.html('capture-port', Template.CapturePort(this.state));
  }

  togglePort(device, portnr) {
    if (device) {
      const conn = this.state.selectedPoints.findIndex(connection => connection.device === device && connection.portnr === portnr);
      if (conn !== -1) {
        this.state.selectedPoints.splice(conn, 1);
      }
      else {
        const attach = CaptureManager.getAttachmentPoint();
        if (attach && !(attach.device === device && attach.portnr === portnr)) {
          this.state.selectedPoints.push({ device: device, portnr: portnr });
        }
      }
    }

    const devports = Array(this.state.devices.length);
    for (let i = 0; i < devports.length; i++) {
      devports[i] = [];
      this.state.selectedPoints.filter(connection => connection.device === this.state.devices[i]).forEach(connection => devports[i][connection.portnr] = 'A');
    }
    this.state.ports = devports;

    this.state.selectedDevice = device;
    this.state.selectedPortNr = portnr;
    this.state.selectedPortName = device && device.readKV(`network.physical.port.${portnr}.name`) || '-';
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

}

module.exports = Capture;
