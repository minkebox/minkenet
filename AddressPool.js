const DeviceInstanceManager = require('./DeviceInstanceManager');
const ClientManager = require('./ClientManager');

class AddressPool {

  constructor(start, end) {
    const sp = start.split('.');
    const ep = end.split('.');
    this.base = sp.slice(0, 3).join('.');
    if (this.base != ep.slice(0, 3).join('.')) {
      throw new Error(`Bad base: ${this.base}`);
    }
    this.start = parseInt(sp[3]);
    this.end = parseInt(ep[3]);
  }

  allocateAddress() {
    for (let a = this.start; a < this.end; a++) {
      const address = `${this.base}.${a}`;
      // Check if we have a device with this IP
      if (DeviceInstanceManager.getDeviceByIP(address)) {
        continue;
      }
      // Check if we have a client with this IP
      if (ClientManager.getClientByIP(address)) {
        continue;
      }
      return address;
    }
    return null;
  }

}

module.exports = {

  pools: {},

  getInstance: function(start, end) {
    let pool = this.pools[`${start}:${end}`];
    if (!pool) {
      pool = new AddressPool(start, end);
      this.pools[`${start}:${end}`] = pool;
    }
    return pool;
  }

};

