const EventEmitter = require('events');
const LocalDevices = require('local-devices');

const DEFAULT_SEARCH_INTERVAL = 10 * 60 * 1000; // 10 minutes
const DEFAULT_WAIT_INTERVAL = 10 * 1000; // 10 seconds

class Arp extends EventEmitter {

  constructor() {
    super();
    this.discovery = null;
    this.found = {};
  }

  start() {
    if (!this.discovery) {
      const run = async () => {
        let update = false;
        update |= this._update(await LocalDevices());
        //await new Promise(resolve => setTimeout(resolve, DEFAULT_WAIT_INTERVAL));
        //update |= this._update(await LocalDevices());
        if (update) {
          this.emit('update');
        }
      };
      this.discovery = setInterval(run, DEFAULT_SEARCH_INTERVAL);
      run();
    }
  }

  _update(devices) {
    let update = false;
    devices.forEach(device => {
      const name = device.name === '?' ? '' : device.name;
      if (!this.found[device.ip] || this.found[device.ip].txt.macAddress != device.mac || this.found[device.ip].txt.hostname != name) {
        this.found[device.ip] = { type: 'arp', ip: device.ip, txt: { macAddress: device.mac, hostname: name } };
        update = true;
      }
    });
    return update;
  }

  stop() {
    if (this.discovery) {
      clearInterval(this.discovery);
      this.discovery = null;
    }
  }

  clear() {
    this.found = {};
  }

  getAddresses() {
    return Object.values(this.found);
  }
}

module.exports = {

  singleton: new Arp(),

  getInstance: function() {
    return this.singleton;
  }

}
