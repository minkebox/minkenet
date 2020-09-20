const Template = require('../Template');
const Page = require('../Page');
const DeviceInstanceManager = require('../../DeviceInstanceManager');
const TopologyManager = require('../../TopologyManager');

class Capture extends Page {

  constructor(send) {
    super(send);
    this.state = {
      devices: [],
      topologyValid: false
    };
  }

  select() {
    super.select();
    this.updateState();
    this.html('main-container', Template.CaptureTab(this.state));
  }

  deselect() {
  }

  updateState() {
    this.state.devices = DeviceInstanceManager.getCaptureDevices();
    this.state.topologyValid = TopologyManager.valid;
  }

}

module.exports = Capture;
