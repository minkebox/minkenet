
const EventEmitter = require('events');
const DB = require('./Database');
const DeviceManager = require('./DeviceManager');
const DeviceState = require('./DeviceState');
const Log = require('debug')('device');

class DeviceInstanceManager extends EventEmitter {

  constructor() {
    super();
    this.devices = {};

    this.onDeviceUpdate = this.onDeviceUpdate.bind(this);
  }

  async start() {
    await Promise.all((await DB.getDevices()).map(async device => {
      const state = await DB.getDeviceState(device._id);
      device = DeviceManager.fromDB(device, state);
      if (device) {
        this.devices[device._id] = device;
        device.on('update', this.onDeviceUpdate);
        if (device.monitor) {
          device.watch();
        }
      }
    }));
    this.onDeviceUpdate();
  }

  stop() {
    for (let id in this.devices) {
      this.devices[id].off('update', this.onDeviceUpdate);
    }
  }

  onDeviceUpdate(reason) {
    if (reason !== 'statistics') {
      this.emit('update');
    }
  }

  getAllDevices() {
    const devices = Object.values(this.devices);
    const ip2int = ip => ip.split('.').reduce((ipInt, octet) => (ipInt << 8) + parseInt(octet), 0) >>> 0;
    devices.sort((a, b) => ip2int(a.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS)) - ip2int(b.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS)));
    return devices;
  }

  getWiFiDevices() {
    return this.getAllDevices().filter(device => device.readKV('network.wireless', { depth: 1 }));
  }

  getAuthenticatedDevices() {
    return this.getAllDevices().filter(device => device._authenticated);
  }

  getDeviceById(id) {
    return this.devices[id];
  }

  getDeviceByIP(ip) {
    for (let id in this.devices) {
      if (this.devices[id].readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS) == ip) {
        return this.devices[id];
      }
    }
    return null;
  }

  addDevice(device) {
    if (!this.devices[device._id]) {
      this.devices[device._id] = device;
      device.on('update', this.onDeviceUpdate);
      this.emit('add');
      this.emit('update');
    }
  }

  removeDevice(device) {
    if (this.devices[device._id]) {
      delete this.devices[device._id];
      device.off('update', this.onDeviceUpdate);
      this.emit('remove');
      this.emit('update');
    }
  }

  async authenticated(device) {
    if (!this.devices[device._id]) {
      throw new Error('Cannot authenticate unknown device');
    }
    if (!device._authenticated) {
      throw new Error('Not authenticated');
    }
    device.on('update', this.onDeviceUpdate);
    await DB.updateDevice(device.toDB());
    await DB.updateDeviceState(device._id, device.state.toDB());
  }

  needCommit() {
    for (let id in this.devices) {
      if (this.devices[id].needCommit()) {
        return true;
      }
    }
    return false;
  }

  async commit(updateCallback) {
    for (let id in this.devices) {
      const device = this.devices[id];
      if (device.needCommit()) {
        if (updateCallback) {
          updateCallback({ op: 'connect', ip: device.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS) });
        }
        try {
          await device.connect();
        }
        catch (_) {
          // We give connect a couple of tries before we fail.
          await device.connect();
        }
      }
    }
    for (let id in this.devices) {
      const device = this.devices[id];
      if (device.needCommit()) {
        if (updateCallback) {
          updateCallback({ op: 'commit', ip: device.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS) });
        }
        try {
          await device.write();
          await device.commit();
        }
        catch (e) {
          Log(e);
        }
      }
    }
  }

  revert() {
    for (let id in this.devices) {
      this.devices[id].revert();
    }
  }

}

module.exports = new DeviceInstanceManager();
