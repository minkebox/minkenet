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

    this.state.selected = this.state.station[0];
    this.state.selected.instances.forEach(instance => {
      this.state.ports[this.state.devices.indexOf(instance.device)] = { active: true };
    });
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
