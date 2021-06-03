const Template = require('../../Template');
const Page = require('../../Page');
const DeviceInstanceManager = require('../../../DeviceInstanceManager');
const MonitorManager = require('../../../MonitorManager');
const ConfigDB = require('../../../Config');


class Monitor extends Page {

  constructor(root) {
    super(root);
    this.state = {
      devices: null,
      config: null
    };
  }

  select() {
    super.select();
    this.updateState();
    this.html('main-container', Template.ConfigMonitorTab(this.state));
  }

  updateState() {
    this.state.devices = DeviceInstanceManager.getAuthenticatedDevices();
    this.state.config = ConfigDB.readAll();
  }

  async 'monitor.change' (msg) {
    const device = DeviceInstanceManager.getDeviceById(msg.value.id);
    if (device) {
      MonitorManager.monitorDevice(device, msg.value.checked);
    }
  }

}

module.exports = Monitor;
