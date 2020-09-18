const Template = require('../Template');
const Page = require('../Page');
const WiFiManager = require('../../WiFiManager');
const Debounce = require('../../utils/Debounce');
const DeviceInstanceManager = require('../../DeviceInstanceManager');

class WiFi extends Page {

  constructor(send) {
    super(send);
    this.state = {
      selectdevicecmd: 'device.toggle',
      devices: [],
      station: [],
      selectedIdx: -1,
      selected: null
    };
  }

  select() {
    super.select();
    this.updateState();
    this.html('main-container', Template.WiFiTab(this.state));
  }

  deselect() {
  }

  updateState() {
    this.state.devices = DeviceInstanceManager.getWiFiDevices();
    this.state.ports = Array(this.state.devices.length);
    this.state.station = WiFiManager.getAllStations();

    if (this.state.selectedIdx === -1) {
      this.state.selectedIdx = 0;
    }
    this.state.selected = this.state.station[this.state.selectedIdx];
    if (this.state.selected) {
      this.state.selected.instances.forEach(instance => {
        this.state.ports[this.state.devices.indexOf(instance.device)] = { active: true };
      });
    }
  }

  async 'select.ssid' (msg) {
    const ssid = msg.value;
    const idx = this.state.station.findIndex(station => station.ssid == ssid);
    if (idx === -1) {
      return;
    }
    this.state.selectedIdx = idx;
    this.updateState();
    this.html('wifi-selected', Template.WiFiSelected(this.state));
  }

  async 'device.toggle' (msg) {
    const device = this.state.devices[msg.value];
    if (this.state.ports[msg.value]) {
      this.state.ports[msg.value] = null;
    }
    else {
      this.state.ports[msg.value] = { active: true };
    }
    this.html('wifi-devices', Template.NetworkCardDevices(this.state));
  }
}

module.exports = WiFi;
