const Template = require('../Template');
const Page = require('../Page');
const DeviceInstanceManager = require('../../DeviceInstanceManager');
const TopologyManager = require('../../TopologyManager');
const ClientManager = require('../../ClientManager');
const TypeConversion = require('../../utils/TypeConversion');
const Debounce = require('../../utils/Debounce');

class Ports extends Page {

  constructor(root) {
    super(root);
    this.state = {
      devices: null,
      selectedDevice: null,
      selectedPort: null,
      selectedPortnr: 0,
      updating: false
    };

    this.onDeviceUpdate = Debounce(this.onDeviceUpdate, this);
    this.onDeviceUpdating = Debounce(this.onDeviceUpdating, this);
  }

  select() {
    super.select();
    this.state.devices = DeviceInstanceManager.getAllDevices();
    this.state.selectedDevice = this.root.common.device;
    this.state.selectedPortnr = this.root.common.portnr;
    if (!this.state.selectedDevice && this.state.devices.length) {
      this.state.selectedDevice = this.state.devices[0];
      this.root.common.device = this.state.selectedDevice;
    }
    if (this.state.selectedPortnr === null) {
      this.state.selectedPortnr = 0;
    }
    this.selectPort();

    this.state.selectedDevice.on('update', this.onDeviceUpdate);
    this.state.selectedDevice.on('updating', this.onDeviceUpdating);
    this.state.selectedDevice.watch();
    this.html('main-container', Template.PortsTab(this.state));
  }

  deselect() {
    if (this.state.selectedDevice) {
      this.state.selectedDevice.off('update', this.onDeviceUpdate);
      this.state.selectedDevice.off('updating', this.onDeviceUpdating);
      this.state.selectedDevice.unwatch();
    }
  }

  async 'device.select' (msg) {
    const device = DeviceInstanceManager.getDeviceById(msg.value);
    if (!device || device === this.state.selectedDevice) {
      return;
    }
    if (this.state.selectedDevice) {
      this.state.selectedDevice.off('update', this.onDeviceUpdate);
      this.state.selectedDevice.off('updating', this.onDeviceUpdating);
      this.state.selectedDevice.unwatch();
    }
    const last = this.state.selectedDevice;
    this.state.selectedDevice = device;
    this.root.common.device = this.state.selectedDevice;
    this.updateCard(last);
    this.updateCard(device);
    this.selectPort();
    if (this.state.selectedDevice) {
      this.state.selectedDevice.on('update', this.onDeviceUpdate);
      this.state.selectedDevice.on('updating', this.onDeviceUpdating);
      this.state.selectedDevice.watch();
    }
  }

  async 'device.port.select' (msg) {
    this.state.selectedPortnr = TypeConversion.toNumber(msg.value.port);
    this.selectPort();
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

  selectPort() {
    this.state.selectedPort = null;
    if (this.state.selectedDevice) {
      let port = this.state.selectedDevice.readKV(`network.physical.port.${this.state.selectedPortnr}`);
      if (!port) {
        this.state.selectedPortnr = 0;
        port = this.state.selectedDevice.readKV(`network.physical.port.${this.state.selectedPortnr}`);
      }
      const macs = ClientManager.getClientsForDeviceAndPort(this.state.selectedDevice, this.state.selectedPortnr);
      this.state.selectedPort = {
        port: port,
        portnr: this.state.selectedPortnr,
        clients: {
          total: macs.length,
          macs: macs
        }
      }
      const peer = TopologyManager.findLink(this.state.selectedDevice, this.state.selectedPortnr);
      if (peer) {
        this.state.selectedPort.peer = `${peer[1].device.name}, port ${peer[1].port + 1}`;
      }
      this.state.porthighlights = [];
      this.state.porthighlights[this.state.selectedPortnr] = 'A';
    }
    else {
      this.state.selectedPortnr = null;
    }
    this.root.common.portnr = this.state.selectedPortnr;
    this.html('details-ports', Template.PortsInfo(this.state));
  }

  onDeviceUpdate() {
    this.state.updating = false;
    this.html('details-ports', Template.PortsInfo(this.state));
  }

  onDeviceUpdating() {
    this.state.updating = true;
    this.html('device-update-spinner', Template.DeviceSpinner({ delay: 2000 }));
  }

}

module.exports = Ports;
