const UDP = require('dgram');
const EventEmitter = require('events');
const Log = require('debug')('discovery');

const PORT_LISTEN = 62992;
const PORT_SEND = 62976;
const BCAST_ADDRESS = '255.255.255.255';
const PING_INTERVAL = 60;

//
// Protocol documentation: https://chrome.google.com/webstore/detail/d-link-network-assistant/eoenegoacckkpkijhfhijfechhhpkbmp
// (Installed: .../Library/Application Support/Google/Chrome/Default/Extensions/eoenegoacckkpkijhfhijfechhhpkbmp/3.0.2.7_0/ddp)
//
class DDP extends EventEmitter {

  constructor() {
    super();
    this.seq = Math.floor(65535 * Math.random());
    this.found = {};
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

  _incoming(msg) {

    // Not a response
    if (msg.readUInt16LE(0) !== 0xFEEE) {
      return;
    }
    // Not discover
    if (msg.readUInt16LE(4) !== 0x00A1) {
      return;
    }
    // Only handle V2
    if (msg.readUInt16LE(18) !== 2) {
      return;
    }

    const body = 22;
    const productName = { start: body + 64, len: 64 };
    const deviceIP = { start: body + 268, len: 4 };
    const webportNumber = { start: body + 272, len: 2 };

    const product = msg.toString('utf8', productName.start, productName.start + productName.len).replace(/\u0000/g, '');
    const ip = `${msg.readInt8(deviceIP.start + 0)}.${msg.readInt8(deviceIP.start + 1)}.${msg.readInt8(deviceIP.start + 2)}.${msg.readInt8(deviceIP.start + 3)}`;
    const port = msg.readUInt16LE(webportNumber.start);

    if (ip) {
      if (!this.found[ip]) {
        this.found[ip] = { type: 'ddp', ip: ip, port: port, txt: { product: product } };
        Log(this.found[ip]);
        this.emit('update');
      }
      else {
        if (this.found[ip].port != port || this.found[ip].txt.product != product) {
          this.found[ip].port = port;
          this.found[ip].txt.product = product;
          this.emit('update');
        }
      }
    }
  }

  probe() {
    const msg = Buffer.alloc(22);

    msg.writeUInt16LE(0xfdfd, 0); // DLink header
    msg.writeUInt16LE(this.seq++ & 0x7FFF, 2); // Sequence nr
    msg.writeUInt16LE(0x00a1, 4); // 0x1a == Discovery

    for (let p = 6; p < 12; p++) {
      msg.writeUInt8(0xff, p); // Mac address - broadcast?
    }
    msg.writeUInt32LE(0x00000000, 12); // IP address - zeros
    msg.writeUInt16LE(0x0000, 16); // 0x0000 - Discovery rect? code

    msg.writeUInt16LE(0x0002, 18); // Version 2
    msg.writeUInt16LE(0x00, 2); // length == 0

    //Log('probe:');
    try {
      this.socket.send(msg, 0, msg.length, PORT_SEND, BCAST_ADDRESS);
    }
    catch (e) {
      Log('send error:', e);
    }
  }

  getAddresses() {
    return Object.values(this.found);
  }

}

module.exports = {
  singleton: new DDP(),

  getInstance: function() {
    return this.singleton;
  }

}
