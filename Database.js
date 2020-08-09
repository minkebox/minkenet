const FS = require('fs');
const Path = require('path');
const DB = require('nedb');
const Log = require('debug')('db');

const DB_PATH = `${__dirname}/db`;
const DB_DEVICES = `${DB_PATH}/devices.db`;
const DB_DEVICE_STATE = `${DB_PATH}/device-state.db`;
const DB_TOPOLOGY = `${DB_PATH}/topology.db`;
const DB_CONFIG = `${DB_PATH}/config.db`;
const DB_MACS = `${DB_PATH}/macs.db`;
const DB_MONITOR_LIST = `${DB_PATH}/monitors.db`;
const DB_MONITOR_PATH = `${DB_PATH}/monitor`;

const DB_COMPACT_SEC = 24 * 60 * 60; // Every day
const DB_FAST_COMPACT_SEC = 5 * 60; // Every 5 minutes
const DB_MONITOR_COMPACT_SEC = DB_FAST_COMPACT_SEC;

function _wrap(fn) {
  return async function(db, ...args) {
    const here = new Error();
    return new Promise((resolve, reject) => {
      args.push((err, val) => {
        if (err) {
          console.error(err);
          console.error(here);
          reject(err);
        }
        else {
          resolve(val);
        }
      });
      fn.apply(db, args);
    });
  }
}

class Database {

  constructor() {
    FS.mkdirSync(DB_PATH, { recursive: true });
    FS.mkdirSync(DB_MONITOR_PATH, { recursive: true });

    const mkdb = (name, compact) => {
      const db = new DB({ filename: name, autoload: true });
      db.persistence.setAutocompactionInterval(compact * 1000);
      return db;
    }

    this._devices = mkdb(DB_DEVICES, DB_COMPACT_SEC);
    this._devicestate = mkdb(DB_DEVICE_STATE, DB_FAST_COMPACT_SEC);
    this._topology = mkdb(DB_TOPOLOGY, DB_COMPACT_SEC);
    this._config = mkdb(DB_CONFIG, DB_COMPACT_SEC);
    this._macs = mkdb(DB_MACS, DB_FAST_COMPACT_SEC);
    this._monitorlist = mkdb(DB_MONITOR_LIST, DB_COMPACT_SEC);

    this._monitors = {};
    FS.readdirSync(DB_MONITOR_PATH).forEach(name => {
      if (Path.extname(name) == '.db') {
        this.createMonitor(Path.basename(name, '.db'));
      }
    });
  }

  async getConfig() {
    return await this._findOne(this._config, { _id: 'config' });
  }

  async updateConfig(config) {
    await this._update(this._config, { _id: config._id }, config, { upsert: true });
  }

  async getDevices() {
    return await this._find(this._devices, {});
  }

  async updateDevice(device) {
    await this._update(this._devices, { _id: device._id }, device, { upsert: true });
  }

  async removeDevice(id) {
    await this._remove(this._devices, { _id: id });
  }

  newDeviceId() {
    return this._devices.createNewId();
  }

  async updateDeviceState(id, state) {
    state._id = id;
    await this._update(this._devicestate, { _id: state._id }, state, { upsert: true });
  }

  async getDeviceState(id) {
    return await this._findOne(this._devicestate, { _id: id });
  }

  async getTopology() {
    return await this._findOne(this._topology, { _id: 'topology' });
  }

  async updateTopology(topology) {
    await this._update(this._topology, { _id: topology._id }, topology, { upsert: true });
  }

  async getMac(mac) {
    return await this._findOne(this._macs, { _id: mac });
  }

  async getAllMacs() {
    return await this._find(this._macs, {});
  }

  async updateMac(info) {
    await this._update(this._macs, { _id: info._id }, info, { upsert: true });
  }

  async getMonitorList() {
    return await this._findOne(this._monitorlist, { _id: 'monitors' });
  }

  async updateMonitorList(monitors) {
    await this._update(this._monitorlist, { _id: monitors._id }, monitors, { upsert: true });
  }

  async createMonitor(name) {
    if (!this._monitors[name]) {
      const db = new DB({ filename: `${DB_MONITOR_PATH}/${name}.db`, autoload: true });
      this._monitors[name] = { db: db, timer: null };
      db.persistence.setAutocompactionInterval(DB_MONITOR_COMPACT_SEC * 1000);
      await this._ensureIndex(db, { fieldName: 'expiresAt', expireAfterSeconds: 0 });
      // Expired records are only marked as such when we attempt to read them, so we periodically do
      // a read to make sure this happens. Otherwise the database will just keep getting bigger.
      this._monitors[name].timer = setInterval(() => {
        this._find(db, {});
      }, DB_MONITOR_COMPACT_SEC * 1000);
    }
  }

  async updateMonitor(name, record) {
    const db = this._monitors[name];
    if (!db) {
      throw new Error(`unknown monitor: ${name}`);
    }
    await this._insert(db.db, record);
  }

  async readMonitor(name) {
    const db = this._monitors[name];
    if (!db) {
      throw new Error(`unknown monitor: ${name}`);
    }
    //return this._find(db.db, {});
    return new Promise((resolve, reject) => {
      db.db.find({}).sort({ expiresAt: 1 }).exec((err, docs) => {
        if (err) {
          return reject(err);
        }
        resolve(docs);
      });
    });
  }

  async removeMonitor(name) {
    const db = this._monitors[name];
    if (!db) {
      throw new Error(`unknown monitor: ${name}`);
    }
    clearInterval(db.timer);
    delete this._monitors[name];
    db.db.persistence.stopAutocompaction();
    FS.unlinkSync(`${DB_MONITOR_PATH}/${name}.db`);
  }

  newMonitorId() {
    return this._topology.createNewId();
  }
}

Database.prototype._find = _wrap(DB.prototype.find);
Database.prototype._findOne = _wrap(DB.prototype.findOne);
Database.prototype._update = _wrap(DB.prototype.update);
Database.prototype._remove = _wrap(DB.prototype.remove);
Database.prototype._insert = _wrap(DB.prototype.insert);
Database.prototype._ensureIndex = _wrap(DB.prototype.ensureIndex);

module.exports = new Database();
