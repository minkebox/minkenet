const Template = require('../Template');
const Page = require('../Page');
const DeviceInstanceManager = require('../../DeviceInstanceManager');
const WiFiManager = require('../../WiFiManager');
const Debounce = require('../../utils/Debounce');

class Radio extends Page {

  constructor(root) {
    super(root);
    this.state = {
      devices: null,
      selectedDevice: null
    };

    this.onDeviceUpdate = Debounce(this.onDeviceUpdate, this);
    this.onListUpdate = Debounce(this.onListUpdate, this);
  }

  select() {
    super.select();
    this.state.devices = DeviceInstanceManager.getWiFiDevices();
    if (!this.state.selectedDevice && this.state.devices.length) {
      this.state.selectedDevice = this.state.devices[0];
    }

    DeviceInstanceManager.on('update', this.onListUpdate);
    if (this.state.selectedDevice) {
      this.state.selectedDevice.on('update', this.onDeviceUpdate);
      this.state.selectedDevice.watch();
    }

    this.html('main-container', Template.RadioTab(this.state));
  }

  deselect() {
    if (this.state.selectedDevice) {
      this.state.selectedDevice.unwatch();
      this.state.selectedDevice.off('update', this.onDeviceUpdate);
    }
    DeviceInstanceManager.off('update', this.onListUpdate);
  }

  async 'device.select' (msg) {
    const device = DeviceInstanceManager.getDeviceById(msg.value);
    if (!device || device === this.state.selectedDevice) {
      return;
    }
    const last = this.state.selectedDevice;
    this.state.selectedDevice = device;
    if (last) {
      last.unwatch();
      last.off('update', this.onDeviceUpdate);
    }
    if (device) {
      device.watch();
      device.on('update', this.onDeviceUpdate);
    }
    this.updateCard(last);
    this.updateCard(device);
    this.html('radio-selected', Template.RadioSelected(this.state));
  }

  async 'kv.update' (msg) {
    this.state.selectedDevice.writeKV(msg.value.k, msg.value.v);
  }

  updateCard(device) {
    if (device) {
      this.html(`device-card-${device._id}`, Template.DeviceCard({
        device: device,
        selectedDevice: this.state.selectedDevice
      }));
    }
  }

  onListUpdate() {
    this.state.devices = DeviceInstanceManager.getWiFiDevices();
    this.html('radio-list', Template.DeviceList(this.state));
  }

  onDeviceUpdate() {
    this.html('radio-selected', Template.RadioSelected(this.state));
  }

}

module.exports = Radio;
