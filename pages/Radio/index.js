const Template = require('../Template');
const Page = require('../Page');
const DeviceInstanceManager = require('../../DeviceInstanceManager');
const WiFiManager = require('../../WiFiManager');
const Debounce = require('../../utils/Debounce');

class Radio extends Page {

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

  async 'device.select' (msg) {
    const device = DeviceInstanceManager.getDeviceById(msg.value);
    if (!device || device === this.state.selectedDevice) {
      return;
    }
    const last = this.state.selectedDevice;
    this.state.selectedDevice = device;
    this.updateCard(last);
    this.updateCard(device);
    this.html('radio-selected', Template.RadioSelected(this.state));
  }

  updateCard(device) {
    if (device) {
      this.html(`device-card-${device._id}`, Template.DeviceCard({
        device: device,
        selectedDevice: this.state.selectedDevice
      }));
    }
  }

}

module.exports = Radio;
