const EventEmitter = require('events');
const DeviceState = require('./DeviceState');
const DB = require('./Database');
const MonitorManager = require('./MonitorManager');


class DeviceInstance extends EventEmitter {

  constructor(config, state) {
    super();
    this._id = config._id;
    this.state = state;
    this.state.on('update', async evt => {
      this.emit('update');
      if (evt.op === 'write' || evt.op === 'merge') {
        MonitorManager.logData(this, evt.key, evt.value);
      }
    });
  }

  get id() {
    console.log(new Error());
    return this._id;
  }

  get name() {
    return this.readKV(DeviceState.KEY_SYSTEM_NAME) || this.readKV(DeviceState.KEY_SYSTEM_FIXEDNAME) || '-';
  }

  get properties() {
    return this.state.state;
  }

  readKV(key, options) {
    return this.state.readKV(key, options);
  }

  writeKV(key, value, options) {
    return this.state.writeKV(key, value, options);
  }

  deleteKV(key) {
    return this.state.deleteKV(key);
  }

  needCommit() {
    return this.state.needCommit();
  }

  revert() {
    this.state.revertKV();
  }

  async read() {
    throw new Error('Abstract');
  }

  async write() {
    throw new Error('Abstract');
  }

  async statistics() {
    throw new Error('Abstract');
  }

  async commit() {
    this.state.commitKV();
    await DB.updateDeviceState(this._id, this.state.toDB());
  }

  mergeIntoState(src, trim, reason) {
    this.state.mergeIntoState(src, trim);
    if (reason) {
      this.emit('update', reason);
    }
    else {
      this.emit('update');
    }
  }

  get monitor() {
    return MonitorManager.isMonitored(this);
  }

}

module.exports = DeviceInstance;
