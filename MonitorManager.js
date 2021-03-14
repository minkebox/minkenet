const EventEmitter = require('events');
const DB = require('./Database');
const Log = require('debug')('monitor');

const MONITOR_EXPIRES = {
  ONEDAY: 24 * 60 * 60 * 1000
};


class MonitorManager extends EventEmitter {

  constructor() {
    super();
    this.enabled = [];
    this.monitors = [];
  }

  async start() {
    const data = await DB.getMonitorList();
    if (data) {
      this.enabled = JSON.parse(data.enabled);
      this.monitors = JSON.parse(data.monitors);
      const DeviceInstanceManager = require('./DeviceInstanceManager');
      for (let i = 0; i < this.enabled.length; i++) {
        const id = this.enabled[i];
        const device = DeviceInstanceManager.getDeviceById(id);
        if (device) {
          await DB.createMonitor(`device-${id}`);
          device.watch();
        }
      }
    }
  }

  stop() {
  }

  async monitorDevice(device, enable) {
    const idx = this.enabled.indexOf(device._id);
    if (idx !== -1) {
      this.enabled.splice(idx, 1);
      device.unwatch();
    }
    if (enable) {
      this.enabled.push(device._id);
      await DB.createMonitor(`device-${device._id}`);
      device.watch();
    }
    await DB.updateMonitorList(this.toDB());
  }

  async monitorDeviceKeysType(device, id, title, keys, monitorType) {
    const idx = this.monitors.findIndex(mon => mon.id === id);
    if (idx !== -1) {
      this.monitors.splice(idx, 1);
    }
    if (keys[0].key !== 'none' && monitorType !== 'none') {
      const mon = {
        id: id,
        deviceid: device._id,
        title: title,
        keys: keys,
        type: monitorType,
        name: `${device._id}-${id}`,
        order: -1
      };
      this.monitors.push(mon);
    }
    await DB.updateMonitorList(this.toDB());
  }

  async monitorCustom(id, enable, title, monitorType) {
    const idx = this.monitors.findIndex(mon => mon.id === id);
    if (idx !== -1) {
      this.monitors.splice(idx, 1);
    }
    if (enable) {
      const mon = {
        id: id,
        title: title,
        type: monitorType,
        order: -1
      };
      this.monitors.push(mon);
    }
    await DB.updateMonitorList(this.toDB());
  }

  async updateMonitors() {
    await DB.updateMonitorList(this.toDB());
  }

  getAllMonitors() {
    return this.monitors;
  }

  getDeviceMonitors(device) {
    const monitors = [];
    this.monitors.forEach(mon => {
      if (mon.deviceid === device._id) {
        monitors.push(mon);
      }
    });
    return monitors;
  }

  logData(device, key, value) {
    if (this.enabled.indexOf(device._id) !== -1 && key.match(/^network\.physical\.port\.[0-9]+\.statistics\./)) {
      DB.updateMonitor(`device-${device._id}`, { key: key, value: value }).catch(err => {
        Log(err);
      });
    }
  }

  isMonitored(device) {
    return this.enabled.indexOf(device._id) !== -1;
  }

  newMonitorId() {
    return DB.newMonitorId();
  }

  toDB() {
    return {
      _id: 'monitors',
      enabled: JSON.stringify(this.enabled),
      monitors: JSON.stringify(this.monitors)
    };
  }

}

module.exports = new MonitorManager();
