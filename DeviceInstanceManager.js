
const EventEmitter = require('events');
const DB = require('./Database');
const DeviceManager = require('./DeviceManager');
const DeviceState = require('./DeviceState');
let TopologyManager;
const Log = require('debug')('device');

const RETRY_COMMIT = 3;

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
    return this.getAllDevices().filter(device => device._authenticated && device.readKV('network.wireless', { depth: 1 }));
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

  async commit(config) {
    config = Object.assign({ direction: 'near-to-far', preconnect: true, retry: 3, callback: null }, config);
    if (!TopologyManager) {
      TopologyManager = require('./TopologyManager');
    }
    // Build a commit-ordered list of devices we need to update
    const devices = TopologyManager.order(Object.values(this.devices).filter(device => device.needCommit()), config.direction);
    // Most commits will pre-connect to all devices before making any changes to limit potential partial-commit problems if
    // a device as failed. Not full proof as a device could fail later.
    let slen = 0;
    if (config.preconnect) {
      const connect = [].concat(devices);
      for (let retry = config.retry; connect.length && retry > 0; retry = (slen === connect.length ? retry - 1 : config.retry)) {
        slen = connect.length;
        for (let i = 0; i < connect.length; ) {
          const device = connect[i];
          if (config.callback) {
            config.callback({ op: 'connect', ip: device.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS) });
          }
          if (await device.verify()) {
            connect.splice(i, 1);
          }
          else {
            i++;
          }
        }
      }
      if (connect.length) {
        throw new Error('Failed to connect');
      }
    }
    for (let retry = config.retry; devices.length && retry > 0; retry = (slen === devices.length ? retry - 1 : config.retry)) {
      slen = devices.length;
      for (let i = 0; i < devices.length; ) {
        const device = devices[i];
        try {
          if (!config.preconnect) {
            if (config.callback) {
              config.callback({ op: 'connect', ip: device.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS) });
            }
            if (!await device.verify()) {
              break;
            }
          }
          if (config.callback) {
            config.callback({ op: 'commit', ip: device.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS) });
          }
          await device.write();
          await device.commit();
          devices.splice(i, 1);
        }
        catch (e) {
          Log(e);
          if (!config.preconnect) {
            break;
          }
          i++;
        }
      }
    }
    if (devices.length) {
      throw new Error('Failed to commit');
    }
  }

  revert() {
    for (let id in this.devices) {
      this.devices[id].revert();
    }
  }

}

module.exports = new DeviceInstanceManager();
