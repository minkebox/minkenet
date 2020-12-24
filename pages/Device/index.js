const Template = require('../Template');
const DB = require('../../Database');
const DeviceManager = require('../../DeviceManager');
const DeviceInstanceManager = require('../../DeviceInstanceManager');
const MonitorManager = require('../../MonitorManager');
const NetworkScanner = require('../../NetworkScanner');
const Discovery = require('../../discovery');
const Debounce = require('../../utils/Debounce');
const Adopt = require('../../Adopt');
const Page = require('../Page');

class Devices extends Page {

  constructor(root) {
    super(root);
    this.authenticating = false;
    this.state = {
      devices: null,
      selectedDevice: null,
      updating: false
    };
    this.forceRefresh = 1;

    this.onDeviceUpdate = Debounce(this.onDeviceUpdate, this);
    this.onDeviceUpdating = Debounce(this.onDeviceUpdating, this);
    this.onListUpdate = Debounce(this.onListUpdate, this);
    this.scanUpdate = this.scanUpdate.bind(this);
    this.discoverUpdate = this.discoverUpdate.bind(this);
  }

  select() {
    super.select();
    DeviceInstanceManager.on('update', this.onListUpdate);
    this.state.devices = DeviceInstanceManager.getAllDevices();
    if (!this.state.selectedDevice && this.state.devices.length) {
      this.state.selectedDevice = this.state.devices[0];
    }
    if (this.state.selectedDevice) {
      this.state.selectedDevice.on('update', this.onDeviceUpdate);
      this.state.selectedDevice.on('updating', this.onDeviceUpdating);
      this.state.selectedDevice.watch();
    }
    this.authenticating = false;
    this.html('main-container', Template.DeviceTab(this.state));
  }

  deselect() {
    if (this.state.selectedDevice) {
      this.state.selectedDevice.unwatch();
      this.state.selectedDevice.off('update', this.onDeviceUpdate);
      this.state.selectedDevice.off('updating', this.onDeviceUpdating);
    }
    DeviceInstanceManager.off('update', this.onListUpdate);
  }

  onDeviceUpdate() {
    this.state.updating = false;
    this.html('details-device', Template.DeviceDetails(this.state));
  }

  onDeviceUpdating() {
    this.state.updating = true;
    this.html('device-update-spinner', Template.DeviceSpinner({ delay: 2000 }));
  }

  onListUpdate(reason) {
    if (this.authenticating) {
      return;
    }
    this.state.devices = DeviceInstanceManager.getAllDevices();
    this.html('devices-column', Template.DeviceList(this.state));
  }

  async 'device.select' (msg) {
    const device = DeviceInstanceManager.getDeviceById(msg.value);
    if (!device || device === this.state.selectedDevice) {
      return;
    }
    if (this.state.selectedDevice) {
      this.state.selectedDevice.unwatch();
      this.state.selectedDevice.off('update', this.onDeviceUpdate);
      this.state.selectedDevice.off('updating', this.onDeviceUpdating);
      this.html(`device-card-${this.state.selectedDevice._id}`, Template.DeviceCard({
        device: this.state.selectedDevice,
        selectedDevice: null
      }));
    }
    this.state.selectedDevice = device;
    if (this.state.selectedDevice) {
      this.state.selectedDevice.on('update', this.onDeviceUpdate);
      this.state.selectedDevice.on('updating', this.onDeviceUpdating);
      this.onDeviceUpdate();
      this.state.selectedDevice.watch();
      this.html(`device-card-${this.state.selectedDevice._id}`, Template.DeviceCard({
        device: this.state.selectedDevice,
        selectedDevice: this.state.selectedDevice
      }));
    }
  }

  async 'device.details.summary.updaterequest' (msg) {
    send('device.details.summary.update', { html: Template.DeviceDetails(this.state), key: msg.value });
  }

  async 'kv.update' (msg) {
    this.state.selectedDevice.writeKV(msg.value.k, msg.value.v);
  }

  async 'device.authenticate.cancel' (msg) {
    this.authenticating = false;
    this.html(`login-modal-status-${msg.value}`, '&nbsp;');
  }

  async 'device.authenticate' (msg) {
    if (this.state.selectedDevice) {
      this.state.selectedDevice.unwatch();
      this.state.selectedDevice.off('update', this.onDeviceUpdate);
      this.state.selectedDevice.off('updating', this.onDeviceUpdating);
      this.html(`device-card-${this.state.selectedDevice._id}`, Template.DeviceCard({
        device: this.state.selectedDevice,
        selectedDevice: null
      }));
    }
    this.state.selectedDevice = null;

    this.authenticating = true;
    let device = DeviceInstanceManager.getDeviceById(msg.value.id);
    if (!device) {
      this.authenticating = false;
      this.html(`login-modal-status-${device._id}`, 'Login failed.');
      return;
    }

    this.html(`login-modal-status-${device._id}`, 'Authenticating ...');

    await device.attach();
    const success = await device.login(msg.value.username, msg.value.password);
    if (!success) {
      this.authenticating = false;
      device.detach();
      this.html(`login-modal-status-${device._id}`, 'Login failed.');
      return;
    }

    if (device.description.generic) {
      // If we're a generic device, we needed to first authenticate and then work out
      // what is is. Now try to identify from the logged-in state.
      const devices = DeviceManager.getDevices();
      let ndevice = null;
      for (let i = 0; i < devices.length; i++) {
        const dev = devices[i];
        if (await dev.identify(device._page, true)) {
          DeviceInstanceManager.removeDevice(device);
          ndevice = dev.newInstanceFromGeneric(device);
          DeviceInstanceManager.addDevice(ndevice);
          break;
        }
      }
      if (!ndevice) {
        this.authenticating = false;
        device.logout(true);
        this.html(`login-modal-status-${device._id}`, 'Login failed.');
        return;
      }
      device = ndevice;
      // Update the constants
      device.state.mergeIntoState(device.description.constants);
    }

    this.html(`login-modal-status-${device._id}`, 'Login success. Adopting ...');

    // Adopt the newly authenticated device.
    let status = null;
    try {
      const adoption = new Adopt(device);
      status = await adoption.configure({
        username: msg.value.username,
        password: msg.value.password
      });
    }
    catch (_) {
      this.authenticating = false;
      device.logout(true);
      this.html(`login-modal-status-${device._id}`, 'Adoption failed.');
      return;
    }

    this.html(`login-modal-status-${device._id}`, 'Configuring device ...');

    // Write the changes to the device. We let this take at least a couple of seconds so we can see this happening.
    await Promise.all([
      new Promise(resolve => setTimeout(resolve, 2000)),
      (async () => {
        await device.write();

        // If we change the address or password we need logout and reauthenticate before we commit
        if (status.newaddress || status.newpassword) {

          if (status.newaddress === 'dhcp') {
            // If we switch to DHCP we cannot guess what the new address will be, so we need to probe for the
            // mac address.
            // ....
          }

          device.logout();
          await device.connect();
        }

        await device.commit();
      })()
    ]);

    DeviceInstanceManager.authenticated(device);

    // Monitor by default
    MonitorManager.monitorDevice(device, true);

    this.send('modal.hide.all');
    this.html(`device-card-${device._id}`, Template.DeviceCard({
      device: device,
      selectedDevice: null
    }));

    this.authenticating = false;
  }

  async 'device.forget' (msg) {
    if (this.state.selectedDevice) {
      this.deselect()
      this.state.selectedDevice.logout();
      MonitorManager.monitorDevice(this.state.selectedDevice, false);
      DeviceInstanceManager.removeDevice(this.state.selectedDevice);
      DB.removeDevice(this.state.selectedDevice._id);
      this.state.selectedDevice = null;
      this.select();
    }
  }

  scanUpdate(evt) {
    this.html('scanner-update', Template.DeviceScanStatus(evt));
    switch (evt.op) {
      case 'running':
        this.html('scan-network-alt', '');
        break;
      case 'done':
        this.html('scan-network-primary', '');
        this.html('scan-network-secondary', 'Done');
        this.scanner.off('status', this.scanUpdate);
        this.scanner = null;
        break;
      default:
        break;
    }
  }

  async 'scan.network' (msg) {
    switch (msg.value) {
      case 'start':
        if (!this.scanner) {
          this.scanner = new NetworkScanner.createScanner({
            addresses: Discovery.getAddresses(),
            pageTimeout: 20000
          });
          this.scanner.on('status', this.scanUpdate);
          this.scanner.start();
        }
        break;
      case 'stop':
        if (this.scanner) {
          this.scanner.stop();
          this.scanner = null;
        }
        setTimeout(() => {
          this.html('scan-network-container', Template.DeviceScan());
        }, 1000);
        break;
      case 'ipaddress':
        this.html('ipdiscovery-container', Template.DeviceIPDiscoveryModal({ refresh: this.forceRefresh++ }));
        break;
      default:
        break;
    }
  }

  discoverUpdate(evt) {
    this.html('ipdiscovery-modal-status', Template.DeviceScanStatus(evt));
    switch (evt.op) {
      case 'done':
        this.html('ipdiscovery-modal-primary', '');
        this.html('ipdiscovery-modal-secondary', 'Done');
        this.scanner.off('status', this.discoverUpdate);
        this.scanner = null;
        break;
      default:
        break;
    }
  }

  async 'discover.ip' (msg) {
    const address = msg.value.split(':');
    // Valid IP
    if (!/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(address[0])) {
      return;
    }
    // Valid port
    if (address[1] && parseInt(address[1]) != address[1]) {
      return;
    }
    this.html('ipdiscovery-modal-primary', '');
    this.scanner = new NetworkScanner.createScanner({
      addresses: [ { type: 'net', ip: address[0], port: parseInt(address[1] || 80) } ],
      pageTimeout: 20000
    });
    this.scanner.on('status', this.discoverUpdate);
    this.scanner.start();
  }

}

module.exports = Devices;
