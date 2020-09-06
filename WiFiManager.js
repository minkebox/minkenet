const EventEmitter = require('events');
const Debounce = require('./utils/Debounce');
const DeviceInstanceManager = require('./DeviceInstanceManager');

class WiFiManager extends EventEmitter {

  constructor() {
    super();
  }

  start() {
    this.deviceUpdate = Debounce(() => {
      this.updateWiFi();
    });
    DeviceInstanceManager.on('update', this.deviceUpdate);
    this.updateWiFi();
  }

  stop() {
    DeviceInstanceManager.off('update', this.deviceUpdate);
  }

  updateWiFi() {

  }

  getAllWiFi() {
    return [];
  }

}

module.exports = new WiFiManager();
