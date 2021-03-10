const EventEmitter = require('events');
const Pup = require('./Pup');
const DeviceManager = require('./DeviceManager');
const DeviceInstanceManager = require('./DeviceInstanceManager');
const DeviceState = require('./DeviceState');
const DB = require('./Database');
const Log = require('debug')('scan');

const DEFAULT_PAGE_TIMEOUT = 2000;

class Scanner extends EventEmitter {

  constructor(config) {
    super();
    this.config = config;
    this.running = false;
  }

  async start() {
    this.running = true;
    const addresses = [].concat(this.config.addresses);
    // Sort the net adresses to the end (they're the slowest to identify)
    addresses.sort((a, b) => a.type === 'net' ? 1 : -1);
    Log('scan:', addresses);
    this.emit('status', { op: 'running' });
    for (let i = 0; i < addresses.length && this.running; i++) {
      if (!DeviceInstanceManager.getDeviceByIP(addresses[i].ip)) {
        this.emit('status', { op: 'scanning', address: addresses[i] });
        const device = await this.identify(addresses[i]);
        if (device && this.running) {
          this.emit('status', { op: 'found', address: addresses[i] });
          const state = DeviceState.newInstance();
          state.mergeIntoState(device.description.constants);
          state.writeKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS, addresses[i].ip, { track: false });
          state.writeKV(DeviceState.KEY_SYSTEM_IPV4_PORT, addresses[i].port, { track: false });
          DeviceInstanceManager.addDevice(device.newInstance({ _id: DB.newDeviceId() }, state));
        }
      }
    }
    if (this.running) {
      this.emit('status', { op: 'done' });
      this.running = false;
    }
  }

  stop() {
    this.emit('status', { op: 'canceled' });
    this.running = false;
  }

  async identify(target) {
    Log('identify:', target);
    const devices = DeviceManager.getDevices();
    const page = await Pup.connect();
    try {
      Log('goto', target.ip);
      await page.goto(`http://${target.ip}:${target.port}`, { timeout: this.config.pageTimeout || DEFAULT_PAGE_TIMEOUT, waitUntil: [ 'load', 'networkidle2' ] });
      //Log('goneto', await page.content());
      for (let i = 0; i < devices.length; i++) {
        const device = devices[i];
        if (!device.description.generic && await device.identify(page, false, target)) {
          Log('identified:', device.description.id);
          return device;
        }
      }
      for (let i = 0; i < devices.length; i++) {
        const device = devices[i];
        if (device.description.generic && await device.identify(page, false, target)) {
          Log('identified:', device.description.id, '(generic)');
          return device;
        }
      }
    }
    catch (e) {
      Log(e);
    }
    finally {
      Pup.disconnect(page);
    }
    return null;
  }

};

module.exports = {
  createScanner: function(config) {
    return new Scanner(config);
  }
}
