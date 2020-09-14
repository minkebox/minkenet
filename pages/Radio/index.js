const Template = require('../Template');
const Page = require('../Page');
const DeviceInstanceManager = require('../../DeviceInstanceManager');
const WiFiManager = require('../../WiFiManager');
const Debounce = require('../../utils/Debounce');

class Wireless extends Page {

  constructor(send) {
    super(send);
    this.state = {
      devices: null,
      selectedDevice: null
    };
  }

  select() {
    super.select();
    this.state.devices = DeviceInstanceManager.getWiFiDevices();
    if (!this.state.selectedDevice && this.state.devices.length) {
      this.state.selectedDevice = this.state.devices[0];
    }
    //this.state.selectedDevice.on('update', this.onDeviceUpdate);
    //this.state.selectedDevice.on('updating', this.onDeviceUpdating);
    //this.state.selectedDevice.watch();
    this.html('main-container', Template.RadioTab(this.state));
  }

  deselect() {
  }

}

module.exports = Wireless;
