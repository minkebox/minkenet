const UDP = require('dgram');
const OS = require('os');
const EventEmitter = require('events');
const Log = require('debug')('discovery');

const PORT_LISTEN = 29810;
const BCAST_ADDRESS = '255.255.255.255';

//
// TP-Link Omada Discovery Protocol
//
class Omada extends EventEmitter {

  constructor() {
    super();
    this.port = null;
    this.found = {};
  }

  start() {
    this.port = {
      socket: UDP.createSocket({
        type: 'udp4',
        reuseAddr: true
      }, (msg, _) => {
        this._incoming(msg);
      })
    };
    this.port.socket.on('error', err => {
      Log('socket bind error: ', err);
    });
    this.port.socket.bind(PORT_LISTEN, () => {
      this.port.socket.setBroadcast(true);
    });
  }

  stop() {
  }

  clear() {
    this.found = {};
  }

  _incoming(msg) {
    const len = msg.readUInt32BE(0);
    if (len + 4 !== msg.length) {
      return;
    }
    const json = JSON.parse(msg.toString('utf8', 4));

    Log('omada:', json);

    const ip = json.body.deviceInfo.ip;
    const model = json.body.deviceInfo.model;

    if (ip) {
      if (!this.found[ip]) {
        this.found[ip] = { type: 'omada', ip: ip, port: 80, txt: { model: model } };
        Log('omada:', this.found[ip]);
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
      try {
        this.port[p].socket.send(msg, 0, msg.length, this.port[p].target, BCAST_ADDRESS);
      }
      catch (e) {
        Log('send error:', e);
      }
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

  singleton: new Omada(),

  getInstance: function() {
    return this.singleton;
  }

}
