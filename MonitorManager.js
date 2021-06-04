const EventEmitter = require('events');
const DB = require('./Database');
const Log = require('debug')('monitor');


class MonitorManager extends EventEmitter {

  constructor() {
    super();
    this.enabled = [];
    this.monitors = [];
  }

  async start() {
    const DeviceInstanceManager = require('./DeviceInstanceManager');
    const data = await DB.getMonitorList();
    if (data) {
      this.enabled = JSON.parse(data.enabled);
      for (let i = 0; i < this.enabled.length; i++) {
        const id = this.enabled[i];
        const device = DeviceInstanceManager.getDeviceById(id);
        if (device) {
          await DB.createMonitor(`device-${id}`);
          device.watch();
        }
      }
      this.monitors = JSON.parse(data.monitors);
      // XXX - Remove me June 6th, 2021
      this.monitors = this.monitors.filter(mon => mon.type !== 'clients');
      // XXX
    }

    this._monitorUpdates = evt => {
      if (evt.type === 'merge' && evt.op === 'update' && this.enabled.indexOf(evt.device._id) !== -1 && evt.key.match(/^network\.physical\.port\.[0-9]+\.statistics\./)) {
        DB.updateMonitor(`device-${evt.device._id}`, { key: evt.key, value: evt.value }).catch(err => Log(err));
      }
    }

    DeviceInstanceManager.on('update', this._monitorUpdates);
  }

  stop() {
    DeviceInstanceManager.on('update', this._monitorUpdates);
    this.enabled.forEach(id => {
      const device = DeviceInstanceManager.getDeviceById(id);
      if (device) {
        device.unwatch();
      }
    });
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
    await this.updateMonitors();
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
    await this.updateMonitors();
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
    await this.updateMonitors();
  }

  getAllMonitors() {
    return this.monitors;
  }

  getDevicePortMonitors(device, portnr) {
    if (this.enabled.indexOf(device._id) === -1) {
      return null;
    }
    const patt = new RegExp(`^network\.physical\.port\.${portnr}\.statistics.*$`);
    const monitors = [];
    this.monitors.forEach(mon => {
      if (mon.deviceid === device._id && mon.keys[0].key.match(patt)) {
        monitors.push(mon);
      }
    });
    return monitors;
  }

  isMonitored(device) {
    return this.enabled.indexOf(device._id) !== -1;
  }

  newMonitorId() {
    return DB.newMonitorId();
  }

  async updateMonitors() {
    this.monitors.sort((a, b) => a.order - b.order);
    this.monitors.forEach((m, idx) => m.order = idx);
    await DB.updateMonitorList(this.toDB());
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
