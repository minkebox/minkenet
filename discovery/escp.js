const UDP = require('dgram');
const OS = require('os');
const EventEmitter = require('events');
const Crypto = require('crypto');
const Log = require('debug')('discovery');

const PORT_LISTEN = 29809;
const PORT_SEND = 29808;
const BCAST_ADDRESS = '255.255.255.255';
const PING_INTERVAL = 60;
const KEY = 'Ei2HNryt8ysSdRRI54XNQHBEbOIRqNjQgYxsTmuW3srSVRVFyLh8mwvhBLPFQph3ecDMLnDtjDUdrUwt7oTsJuYl72hXESNiD6jFIQCtQN1unsmn3JXjeYwGJ55pqTkVyN2OOm3vekF6G1LM4t3kiiG4lGwbxG4CG1s5Sli7gcINFBOLXQnPpsQNWDmPbOm74mE7eyR3L7tk8tUhI17FLKm11hrrd1ck74bMw3VYSK3X5RrDgXelewMU6o1tJ3iX';

//
// Easy Smart Configuration Protocol (TP-Link)
// https://github.com/janisstreib/tp-link-intercept
//
class ESCP extends EventEmitter {

  constructor() {
    super();
    this.seq = Math.floor(65535 * Math.random());
    this.found = {};
    this.mac = this.getMacAddress();
  }

  start() {
    this.socket = UDP.createSocket({
      type: 'udp4',
      reuseAddr: true
    }, (msg, _) => {
      this._incoming(msg);
    });
    this.socket.on('error', err => {
      Log('socket bind error: ', err);
    });
    this.socket.bind(PORT_LISTEN, () => {
      this.socket.setBroadcast(true);
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

  _incoming(cmsg) {
    const cipher = Crypto.createDecipheriv('rc4', KEY, '');
    const msg = cipher.update(cmsg)
    cipher.final();

    let ip = null;
    let model = null;

    if (msg.readUInt8(0) !== 0x01 && msg.readUInt8(1) !== 0x02) {
      return;
    }

    for (let p = 32; p < msg.length; ) {
      const type = msg.readUInt16BE(p);
      const len = msg.readUInt16BE(p + 2);
      switch (type) {
        case 1: // Device model
          model = msg.toString('utf8', p + 4, p + 4 + len - 1);
          break;
        case 4: // IP
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
        this.found[ip] = { type: 'escp', ip: ip, port: 80, txt: { model: model } };
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
    const msg = Buffer.alloc(36);

    msg.writeUInt8(0x01, 0); // Protocol v1
    msg.writeUInt8(0x00, 1); // Opcode - discover
    for (let p = 2; p < 8; p++) {
      msg.writeUInt8(0x00, p); // Target mac address (00:00:00:00:00:00 for broadcast)
    }
    for (let p = 8; p < 14; p++) {
      msg.writeUInt8(this.mac[p - 8], p); // Host mac address
    }
    msg.writeUInt16BE(this.seq++ & 0x7FFF, 14); // Sequence nr.
    msg.writeUInt32BE(0, 16); // Error code
    msg.writeUInt16BE(36, 20); // Length
    msg.writeUInt32BE(0, 22); // Fragment
    msg.writeUInt16BE(0, 26); // Token id
    msg.writeUInt32BE(0, 28); // Checksum
    msg.writeUInt16BE(0xffff, 32); // Body

    const cipher = Crypto.createCipheriv('rc4', KEY, '');
    const cmsg = cipher.update(msg)
    cipher.final();

    this.socket.send(cmsg, 0, cmsg.length, PORT_SEND, BCAST_ADDRESS);
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
  singleton: new ESCP(),

  getInstance: function() {
    return this.singleton;
  }

}
