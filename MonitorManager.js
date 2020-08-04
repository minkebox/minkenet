const EventEmitter = require('events');
const DB = require('./Database');

const MONITOR_EXPIRE = 60 * 60 * 1000; // 1 hour


class MonitorManager extends EventEmitter {

  constructor() {
    super();
    this.enabled = [];
    this.monitors = [];
    this._devkey2mons = {};
  }

  async start() {
    const data = await DB.getMonitorList();
    if (data) {
      this.enabled = JSON.parse(data.enabled);
      this.monitors = JSON.parse(data.monitors);
      for (let i = 0; i < this.monitors.length; i++) {
        if (!('order' in this.monitors[i])) this.monitors[i].order = 0;
        await DB.createMonitor(this.monitors[i].name);
      }
      const DeviceInstanceManager = require('./DeviceInstanceManager');
      this.enabled.forEach(id => {
        const device = DeviceInstanceManager.getDeviceById(id);
        if (device) {
          device.watch();
        }
      });
      this._buildMap();
    }5
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
      device.watch();
    }
    this._buildMap();
    await DB.updateMonitorList(this.toDB());
  }

  async monitorDeviceKeysType(device, id, title, keys, monitorType) {
    const idx = this.monitors.findIndex(mon => mon.id === id);
    if (idx !== -1) {
      const old = this.monitors.splice(idx, 1);
      this._buildMap();
      await DB.removeMonitor(old[0].name);
    }
    if (keys[0] !== 'none' && monitorType !== 'none') {
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
      await DB.createMonitor(mon.name);
      this._buildMap();
    }
    await DB.updateMonitorList(this.toDB());
  }

  async monitorCustom(id, enable, monitorType) {
    const idx = this.monitors.findIndex(mon => mon.id === id);
    if (idx !== -1) {
      this.monitors.splice(idx, 1);
    }
    if (enable) {
      const mon = {
        id: id,
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
    const dev = this._devkey2mons[device._id];
    if (dev) {
      const prop = dev.key[key];
      if (prop) {
        prop.monitors.forEach(mon => {
          DB.updateMonitor(mon.name, { key: key, value: value, expiresAt: new Date(Date.now() + MONITOR_EXPIRE) });
        });
      }
    }
  }

  isMonitored(device) {
    return this.enabled.indexOf(device._id) !== -1;
  }

  newMonitorId() {
    return DB.newMonitorId();
  }

  _buildMap() {
    this._devkey2mons = {};
    this.monitors.forEach(mon => {
      if (this.enabled.indexOf(mon.deviceid) !== -1) {
        const dev = this._devkey2mons[mon.deviceid] || (this._devkey2mons[mon.deviceid] = { key: {} });
        mon.keys.forEach(k => {
          const prop = dev.key[k.key] || (dev.key[k.key] = { monitors: [] });
          prop.monitors.push(mon);
        });
      }
    });
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
