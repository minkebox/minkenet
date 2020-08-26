const UDP = require('dgram');
const OS = require('os');
const EventEmitter = require('events');

const PORT_LISTEN = [ 63321, 63323 ];
const PORT_SEND = [ 63322, 63324 ];
const BCAST_ADDRESS = '255.255.255.255';
const PING_INTERVAL = 60;

//
// Netgear Switch Discovery Protocol
// https://en.wikipedia.org/wiki/Netgear_NSDP
//
class NSDP extends EventEmitter {

  constructor() {
    super();
    this.seq = 1;
    this.port = [];
    this.found = {};
    this.mac = this.getMacAddress();
  }

  start() {
    PORT_LISTEN.forEach((port, i) => {
      this.port[i] = {
        target: PORT_SEND[i],
        socket: UDP.createSocket({
          type: 'udp4',
          reuseAddr: true
        }, (msg, _) => {
          this._incoming(msg);
        })
      };
      this.port[i].socket.bind(port, () => {
        this.port[i].socket.setBroadcast(true);
      });
    });
    const ping = () => this.probe();
    this._ping = setInterval(ping, PING_INTERVAL * 1000);
    ping();
  }

  stop() {
    if (this._ping) {
      clearInterval(this._ping);
      this._ping = null;
    }
  }

  clear() {
    this.found = {};
  }

  _incoming(msg) {
    let ip = null;
    let model = null;
    for (let p = 32; p < msg.length; ) {
      const type = msg.readUInt16BE(p);
      const len = msg.readUInt16BE(p + 2);
      switch (type) {
        case 1: // Device model
          model = msg.toString('utf8', p + 4, p + 4 + len);
          break;
        case 6: // IP
          let ip32 = msg.readUInt32BE(p + 4);
          ip = ip32 % 256;
          for (let i = 3; i > 0; i--) {
            ip32 = Math.floor(ip32 / 256);
            ip = `${ip32 % 256}.${ip}`;
          }
          break;
        default:
          break;
      }
      p += 4 + len;
    }
    if (ip) {
      if (!this.found[ip]) {
        this.found[ip] = { type: 'nsdp', ip: ip, port: 80, txt: { model: model } };
        //console.log(this.found);
        this.emit('update');
      }
      else {
        if (this.found[ip].txt.model != model) {
          this.found[ip].txt.model = model;
          this.emit('update');
        }
      }
    }
  }

  probe() {
    const msg = Buffer.alloc(44);

    // Header
    msg.writeUInt8(0x01, 0); // Protocol v1
    msg.writeUInt8(0x01, 1); // Read request
    msg.writeUInt16BE(0x0000, 2); // Operation result
    msg.writeUInt32BE(0x00000000, 4); // Unknown
    for (let p = 8; p < 14; p++) {
        msg.writeUInt8(this.mac[p - 8], p); // Host mac address
    }
    for (let p = 14; p < 20; p++) {
      msg.writeUInt8(0x00, p); // Target mac address (00:00:00:00:00:00 for broadcast)
    }
    msg.writeUInt16BE(0x0000, 20); // Unknown
    msg.writeUInt16BE(this.seq++ & 0x7FFF, 22); // Sequence nr.
    msg.writeUInt32BE(0x4E534450, 24); // Signature NSDP
    msg.writeUInt32BE(0x00000000, 28); // Unknown
    // Body
    msg.writeUInt16BE(0x0001, 32); // Device model
    msg.writeUInt16BE(0x0000, 34);
    msg.writeUInt16BE(0x0006, 36); // Device IP
    msg.writeUInt16BE(0x0000, 38);
    // End Marker
    msg.writeUInt32BE(0xffff0000, 40);

    for (let p = 0; p < this.port.length; p++) {
      this.port[p].socket.send(msg, 0, msg.length, this.port[p].target, BCAST_ADDRESS);
    }
  }

  getMacAddress() {
    let mac = [ 0, 0, 0, 0, 0, 0 ];
    const ifaces = OS.networkInterfaces();
    for (let iface in ifaces) {
      ifaces[iface].forEach(address => {
        if (!address.internal && address.family === 'IPv4') {
          mac = address.mac.split(':').map(v => parseInt(v, 16));
        }
      });
    }
    return mac;
  }

  getAddresses() {
    return Object.values(this.found);
  }

}

module.exports = {

  singleton: new NSDP(),

  getInstance: function() {
    return this.singleton;
  }

}
