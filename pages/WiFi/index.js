const Template = require('../Template');
const Page = require('../Page');
const WiFiManager = require('../../WiFiManager');
const Debounce = require('../../utils/Debounce');
const DeviceInstanceManager = require('../../DeviceInstanceManager');

class WiFi extends Page {

  constructor(root) {
    super(root);
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
    const station = this.state.station[this.state.selectedIdx];
    if (station) {
      station.instances.forEach(instance => {
        this.state.ports[this.state.devices.indexOf(instance.device)] = { active: true };
      });
      this.state.selected = WiFiManager.getStationConfig(station);
    }
    else {
      this.state.selected = null;
    }
  }

  async 'select.ssid' (msg) {
    const ssid = msg.value;
    const idx = this.state.station.findIndex(station => station.instances[0].station.ssid == ssid);
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
      WiFiManager.removeDeviceFromStation(this.state.selected.station, device);
    }
    else {
      WiFiManager.addDeviceToStation(this.state.selected.station, device);
    }
    this.updateState();
    this.html('wifi-selected', Template.WiFiSelected(this.state));
  }

  async 'network.wifi.create' (msg) {
    const ssid = msg.value;
    const idx = this.state.station.findIndex(station => station.ssid.name == ssid);
    if (idx !== -1) {
      // Already exists - so just select it
      this.state.selectedIdx = idx;
    }
    else {
      WiFiManager.createStation(ssid);
      this.state.station = WiFiManager.getAllStations();
      this.state.selectedIdx = this.state.station.findIndex(station => station.ssid.name == ssid);
    }
    this.updateState();
    this.html('wifi-list', Template.WiFiList(this.state));
    this.html('wifi-selected', Template.WiFiSelected(this.state));
  }
}

module.exports = WiFi;
