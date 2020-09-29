const EventEmitter = require('events');
const NodeMndp = require('node-mndp').NodeMndp;
const Log = require('debug')('discovery');

const ATTR = [ 'identity', 'version', 'platform', 'update', 'board' ];

class MNDP extends EventEmitter {

  constructor() {
    super();
    this.discovery = null;
    this.found = {};
    this._onDeviceFound = this._onDeviceFound.bind(this);
    this._onError = this._onError.bind(this);
  }

  start() {
    if (!this.discovery) {
      this.discovery = new NodeMndp({});
      this.discovery.on('deviceFound', this._onDeviceFound);
      this.discovery.on('error', this._onError);
      this.discovery.start();
    }
  }

  stop() {
    if (this.discovery) {
      this.discovery.stop();
      this.discovery.off('deviceFound', this._onDeviceFound);
      this.discovery.off('error', this._onError);
      this.discovery = null;
    }
  }

  clear() {
    this.found = {};
  }

  _onError(err) {
    Log('mndp error:', err);
  }

  _onDeviceFound(device) {
    const ip = device.ipAddress;
    const macAddress = device.macAddress.replace(/(..)(?!$)/g,'$1:');
    let match = false;
    if (this.found[ip] && this.found[ip].txt.macAddress == macAddress) {
      match = true;
      ATTR.forEach(attr => match = match & (device[attr] == this.found[ip].txt[attr]));
    }
    if (!match) {
      const txt = { macAddress: macAddress };
      ATTR.forEach(attr => txt[attr] = device[attr]);
      this.found[ip] = { type: 'mndp', ip: ip, port: 80, txt: txt };
      Log(this.found[ip]);
      this.emit('update');
    }
  }

  getAddresses() {
    return Object.values(this.found);
  }
}

module.exports = {

  singleton: new MNDP(),

  getInstance: function() {
    return this.singleton;
  }

}
