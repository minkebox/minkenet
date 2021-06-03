const Template = require('../Template');
const DB = require('../../Database');
const DeviceManager = require('../../DeviceManager');
const DeviceInstanceManager = require('../../DeviceInstanceManager');
const ClientManager = require('../../ClientManager');
const TopologyManager = require('../../TopologyManager');
const MonitorManager = require('../../MonitorManager');
const NetworkScanner = require('../../NetworkScanner');
const Discovery = require('../../discovery');
const Debounce = require('../../utils/Debounce');
const TypeConversion = require('../../utils/TypeConversion');
const Adopt = require('../../Adopt');
const Page = require('../Page');
const Log = require('debug')('devices');

class Devices extends Page {

  constructor(root) {
    super(root);
    this.authenticating = false;
    this.state = {
      devices: null,
      selectedDevice: null,
      selectedPort: null,
      selectedPortnr: 0,
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
    DeviceInstanceManager.on('add', this.onListUpdate);
    DeviceInstanceManager.on('remove', this.onListUpdate);
  }

  deselect() {
    if (this.state.selectedDevice) {
      this.state.selectedDevice.unwatch();
      this.state.selectedDevice.off('update', this.onDeviceUpdate);
      this.state.selectedDevice.off('updating', this.onDeviceUpdating);
    }
    DeviceInstanceManager.off('add', this.onListUpdate);
    DeviceInstanceManager.off('remove', this.onListUpdate);
    this.root.common.device = this.state.selectedDevice;
    this.root.common.portnr = this.state.selectedPortnr;
  }

  tabSelect(tab, arg) {
    this.state.type = tab;
    this.state.devices = this.getDevices();
    this.state.selectedDevice = this.root.common.device;
    if (this.state.selectedDevice && this.state.devices.indexOf(this.state.selectedDevice) === -1) {
      this.state.selectedDevice = null;
    }
    if (!this.state.selectedDevice && this.state.devices.length) {
      this.state.selectedDevice = this.state.devices[0];
    }
    if (this.state.selectedDevice) {
      this.state.selectedDevice.on('update', this.onDeviceUpdate);
      this.state.selectedDevice.on('updating', this.onDeviceUpdating);
      this.state.selectedDevice.watch();
    }
    this.selectPort();

    this.authenticating = false;
    this.html('main-container', Template.DeviceTab(this.state));
  }

  onDeviceUpdate() {
    this.state.updating = false;
    this.html('details-device', Template.DeviceDetails(this.state));
  }

  onDeviceUpdating() {
    this.state.updating = true;
    this.html('device-update-spinner', Template.DeviceSpinner({ delay: 2000 }));
  }

  onListUpdate() {
    if (this.authenticating) {
      return;
    }
    this.state.devices = this.getDevices();
    this.html('devices-column', Template.DeviceList(this.state));
  }

  getDevices() {
    switch (this.state.type) {
      case 'switches':
        return DeviceInstanceManager.getSwitchDevices();
      case 'aps':
        return DeviceInstanceManager.getWiFiDevices();
      case 'new':
        return DeviceInstanceManager.getUnauthenticatedDevices();
      case 'all':
      default:
        return DeviceInstanceManager.getAuthenticatedDevices();
    }
  }

  selectPort() {
    this.state.selectedPort = null;
    if (this.state.selectedDevice) {
      // Select the port, and default if it fails
      let port = this.state.selectedDevice.readKV(`network.physical.port.${this.state.selectedPortnr}`);
      if (!port) {
        this.state.selectedPortnr = 0;
        port = this.state.selectedDevice.readKV(`network.physical.port.${this.state.selectedPortnr}`);
      }

      // Find the clients on this port
      const macs = ClientManager.getClientsForDeviceAndPort(this.state.selectedDevice, this.state.selectedPortnr);
      this.state.selectedPort = {
        port: port,
        portnr: this.state.selectedPortnr,
        clients: {
          total: macs.length,
          macs: macs
        },
        monitors: null
      }

      // Find the peer
      const peer = TopologyManager.findLink(this.state.selectedDevice, this.state.selectedPortnr);
      if (peer) {
        this.state.selectedPort.peer = `${peer[1].device.name}, port ${peer[1].port + 1}`;
      }

      // Highlight the selected port
      this.state.porthighlights = [];
      this.state.porthighlights[this.state.selectedPortnr] = 'A';

      // Find monitors
      const monitors = MonitorManager.getDevicePortMonitors(this.state.selectedDevice, this.state.selectedPortnr);
      if (monitors) {
        this.state.selectedPort.monitors = {
          hourly: false,
          daily: false
        };
        monitors.forEach(mon => {
          switch (mon.type) {
            case '1hour':
              this.state.selectedPort.monitors.hourly = true;
              break;
            case '1day':
              this.state.selectedPort.monitors.daily = true;
              break;
            default:
              break;
          }
        });
      }
    }

    else {
      this.state.selectedPortnr = null;
    }

    this.html('port-info', Template.DevicePortInfo(this.state));
    this.html('port-settings', Template.DevicePortSettings(this.state));
    this.html('port-monitors', Template.DevicePortMonitors(this.state));
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
    this.selectPort();
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

  async 'device.port.select' (msg) {
    this.state.selectedPortnr = TypeConversion.toNumber(msg.value.port);
    this.selectPort();
  }

  async 'kv.update' (msg) {
    this.state.selectedDevice.writeKV(msg.value.k, msg.value.v);
  }

  async 'monitor.update' (msg) {
    const type = msg.value.k;
    const enabled = msg.value.v;

    let keys = [];
    if (this.state.selectedDevice.readKV(`network.physical.port.${this.state.selectedPortnr}.statistics.rx.bytes`)) {
      // Bytes
      keys = [
        { key: `network.physical.port.${this.state.selectedPortnr}.statistics.rx.bytes`, title: 'RX (Mbps)', scale: 0.000008 },
        { key: `network.physical.port.${this.state.selectedPortnr}.statistics.tx.bytes`, title: 'TX (Mbps)', scale: 0.000008 }
      ];
    }
    else {
      // Packets
      keys = [
        { key: `network.physical.port.${this.state.selectedPortnr}.statistics.rx.packets`, title: 'RX (Mpps)', scale: 0.000001 },
        { key: `network.physical.port.${this.state.selectedPortnr}.statistics.tx.packets`, title: 'TX (Mpps)', scale: 0.000001 }
      ];
    }

    const mons = MonitorManager.getDevicePortMonitors(this.state.selectedDevice, this.state.selectedPortnr);
    if (mons) {
      const mon = mons.find(mon => mon.type == type);
      await MonitorManager.monitorDeviceKeysType(
        this.state.selectedDevice,
        mon ? mon.id : MonitorManager.newMonitorId(),
        `##device##${this.state.selectedPortnr}`,
        keys,
        enabled ? type : 'none'
      );
    }
  }

  async 'device.authenticate.open' (msg) {
    const device = DeviceInstanceManager.getDeviceById(msg.value.id);
    if (!device) {
      return;
    }
    if (this.state.selectedDevice && this.state.selectedDevice !== device) {
      Log('closing watched device:');
      this.state.selectedDevice.unwatch();
      this.state.selectedDevice.off('update', this.onDeviceUpdate);
      this.state.selectedDevice.off('updating', this.onDeviceUpdating);
      this.html(`device-card-${this.state.selectedDevice._id}`, Template.DeviceCard({
        device: this.state.selectedDevice,
        selectedDevice: null
      }));
    }
    this.state.selectedDevice = device;
    this.state.selectedDevice.watch();
    this.html('device-auth-modal-container', Template.DeviceAuthModal(this.state.selectedDevice));
  }

  async 'device.authenticate.cancel' (msg) {
    this.authenticating = false;
    this.html(`login-modal-status`, '&nbsp;');
  }

  async 'device.authenticate.credentials' (msg) {
    Log('device.authenticate.credentials:');
    this.authenticating = true;

    Log('authenticating:');
    this.html(`login-modal-status`, 'Authenticating ...');

    await this.state.selectedDevice.attach();
    Log('attached:');
    const success = await this.state.selectedDevice.login(msg.value.username, msg.value.password);
    Log('login: success=', success);
    if (!success) {
      this.authenticating = false;
      this.state.selectedDevice.detach();
      this.html(`login-modal-status`, 'Login failed.');
      return;
    }

    if (this.state.selectedDevice.description.generic) {
      Log('switch from generic:');
      // If we're a generic device, we needed to first authenticate and then work out
      // what is is. Now try to identify from the logged-in state.
      const devices = DeviceManager.getDevices();
      let ndevice = null;
      for (let i = 0; i < devices.length; i++) {
        const dev = devices[i];
        if (await dev.identify(this.state.selectedDevice._page, true)) {
          DeviceInstanceManager.removeDevice(this.state.selectedDevice);
          ndevice = dev.newInstanceFromGeneric(this.state.selectedDevice);
          DeviceInstanceManager.addDevice(ndevice);
          break;
        }
      }
      if (!ndevice) {
        this.authenticating = false;
        this.state.selectedDevice.logout(true);
        this.html(`login-modal-status`, 'Login failed.');
        return;
      }
      this.state.selectedDevice = ndevice;
      // Update the constants
      this.state.selectedDevice.state.mergeIntoState(this.state.selectedDevice.description.constants);
    }

    Log('adopting:');
    this.html(`login-modal-status`, 'Login success. Adopting ...');

    // Adopt the newly authenticated device.
    let status = null;
    try {
      const adoption = new Adopt(this.state.selectedDevice);
      status = await adoption.configure({
        username: msg.value.username,
        password: msg.value.password
      });
    }
    catch (_) {
      this.authenticating = false;
      this.state.selectedDevice.logout(true);
      this.html(`login-modal-status`, 'Adoption failed.');
      return;
    }

    this.html(`login-modal-status`, 'Configuring device ...');

    // Write the changes to the device. We let this take at least a couple of seconds so we can see this happening.
    await Promise.all([
      new Promise(resolve => setTimeout(resolve, 2000)),
      (async () => {
        await this.state.selectedDevice.write();

        // If we change the address or password we need logout and reauthenticate before we commit
        if (status.newaddress || status.newpassword) {

          if (status.newaddress === 'dhcp') {
            // If we switch to DHCP we cannot guess what the new address will be, so we need to probe for the
            // mac address.
            // ....
          }

          this.state.selectedDevice.logout();
          await this.state.selectedDevice.connect();
        }

        await this.state.selectedDevice.commit();
      })()
    ]);

    DeviceInstanceManager.authenticated(this.state.selectedDevice);

    // Monitor by default
    MonitorManager.monitorDevice(this.state.selectedDevice, true);

    this.send('modal.hide.all');
    this.html(`device-card`, Template.DeviceCard({
      device: this.state.selectedDevice,
      selectedDevice: null
    }));

    this.authenticating = false;
  }

  async 'device.forget' (msg) {
    if (!this.state.selectedDevice) {
      return;
    }
    this.state.selectedDevice.unwatch();
    this.state.selectedDevice.off('update', this.onDeviceUpdate);
    this.state.selectedDevice.off('updating', this.onDeviceUpdating);

    this.state.selectedDevice.logout();
    MonitorManager.monitorDevice(this.state.selectedDevice, false);
    DeviceInstanceManager.removeDevice(this.state.selectedDevice);
    DB.removeDevice(this.state.selectedDevice._id);

    this.state.selectedDevice = null;

    this.state.devices = DeviceInstanceManager.getAllDevices();
    if (this.state.devices.length) {
      this.state.selectedDevice = this.state.devices[0];
      this.state.selectedDevice.on('update', this.onDeviceUpdate);
      this.state.selectedDevice.on('updating', this.onDeviceUpdating);
      this.state.selectedDevice.watch();
    }

    this.html('main-container', Template.DeviceTab(this.state));
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
