const FS = require('fs');
const BrowserDevice = require('./BrowserDevice');
const DeviceState = require('./DeviceState');

class DeviceManager {

  constructor() {
    this.devices = [];
    this.loadDevices(`${__dirname}/device`);
  }

  loadDevices(dir) {
    FS.readdirSync(dir, { encoding: 'utf8', withFileTypes: true }).forEach(entry => {
      if (entry.isDirectory()) {
        this.loadDevices(`${dir}/${entry.name}`);
      }
      else if (entry.name === 'index.js') {
        const description = require(dir);
        switch (description.type || 'browser') {
          case 'browser':
            this.devices.push(new BrowserDevice(description));
            break;
          default:
            break;
        }
      }
    });
  }

  getDevices() {
    return this.devices;
  }

  fromDB(dbDevice, dbState) {
    const device = this.devices.find(device => device.description.id === dbDevice.dmId);
    if (!device) {
      return null;
    }
    const devinst = device.newInstance(dbDevice, DeviceState.fromDB(dbState));
    devinst._authenticated = true;
    return devinst;
  }
}

module.exports = new DeviceManager();
