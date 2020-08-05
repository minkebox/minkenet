const Template = require('../Template');
const Page = require('../Page');
const DeviceInstanceManager = require('../../DeviceInstanceManager');
const ClientManager = require('../../ClientManager');
const TopologyManager = require('../../TopologyManager');
const MonitorManager = require('../../MonitorManager');
const ConfigDB = require('../../Config');


class Monitor extends Page {

  constructor(send) {
    super(send);
    this.state = {
      devices: null,
      selectedIndex: 0,
      selected: null,
      selectedPortNr: 0,
      selectedPort: null,
      porthighlights: null,
      config: null
    };
  }

  select() {
    super.select();
    this.updateState();
    this.html('main-container', Template.MonitorTab(this.state));
  }

  updateState() {
    this.state.devices = DeviceInstanceManager.getAuthenticatedDevices();
    if (this.state.devices.length) {
      this.state.selected = this.state.devices[this.state.selectedIndex];
      this.state.porthighlights = [];
      if (this.state.selected.monitor) {
        this.state.porthighlights.active = 'A';
      }
      const portRoot = `network.physical.port.${this.state.selectedPortNr}`;
      this.state.selectedPort = this.state.selected.readKV(portRoot);
      this.state.porthighlights[this.state.selectedPortNr] = 'A';
      const macs = ClientManager.getClientsForDeviceAndPort(this.state.selected, this.state.selectedPortNr);
      if (macs.length === 1) {
        this.state.peer = macs[0].name;
      }
      else {
        const peer = TopologyManager.findLink(this.state.selected, this.state.selectedPortNr);
        if (peer) {
          this.state.peer = `${peer[1].device.name}, port ${peer[1].port + 1}`;
        }
        else {
          this.state.peer = null;
        }
      }
      this.state.monitors = [];
      const monitors = MonitorManager.getDeviceMonitors(this.state.selected);
      for (let i = 0; i < monitors.length; i++) {
        const mon = monitors[i];
        if (mon.keys[0].key.indexOf(portRoot) === 0) {
          this.state.monitors.push({ id: mon.id, key: mon.keys.map(k => k.key.substring(portRoot.length + 1)).join(','), type: mon.type });
        }
      }
      this.state.monitors.push({ id: MonitorManager.newMonitorId(), key: 'none', type: 'none' });
    }
    this.state.config = ConfigDB.readAll();
  }

  async 'monitor.select' (msg) {
    const device = DeviceInstanceManager.getDeviceById(msg.value);
    if (device) {
      this.state.selectedIndex = this.state.devices.indexOf(device);
      this.state.selectedPortNr = 0;
      this.updateState();
      this.html('main-container', Template.MonitorTab(this.state));
    }
  }

  async 'monitor.change' (msg) {
    const device = DeviceInstanceManager.getDeviceById(msg.value.id);
    if (device) {
      MonitorManager.monitorDevice(device, msg.value.checked);
      this.updateState();
      this.html('monitor-details-column', Template.MonitorSelected(this.state));
    }
  }

  async 'device.port.select' (msg) {
    this.state.selectedPortNr = parseInt(msg.value.port);
    this.updateState();
    this.html('monitor-details-column', Template.MonitorSelected(this.state));
  }

  async 'monitor.port.key' (msg) {
    const mon = this.state.monitors.find(mon => mon.id == msg.value.i);
    if (mon) {
      mon.key = msg.value.k;
      if (mon.key === 'none') {
        mon.type = 'none';
      }
      await this.updateMonitor(mon);
    }
  }

  async 'monitor.port.value' (msg) {
    const mon = this.state.monitors.find(mon => mon.id == msg.value.i);
    if (mon) {
      mon.type = msg.value.v;
      if (mon.type === 'none') {
        mon.key = 'none';
      }
      await this.updateMonitor(mon);
    }
  }

  async 'config.change' (msg) {
    ConfigDB.write(msg.value.key, msg.value.value);
    switch (msg.value.key) {
      case 'monitor.clients':
        await MonitorManager.monitorCustom('clients', msg.value.value, 'Clients', 'clients');
        break;
      default:
        break;
    }
  }

  async updateMonitor(mon) {
    let title = this.state.selected.name;
    if (this.state.selectedPort.name) {
      title = this.state.selectedPort.name;
    }
    await MonitorManager.monitorDeviceKeysType(
      this.state.selected,
      mon.id,
      title,
      mon.key.split(',').map(k => {
        let name = k;
        let scale = 1;
        switch (k) {
          case 'statistics.rx.bytes':
            name = 'RX (byte)';
            scale = 8;
            break;
          case 'statistics.tx.bytes':
            name = 'TX (byte)';
            scale = 8;
            break;
          case 'statistics.rx.packets':
            name = 'RX (packets)';
            scale = 1;
            break;
          case 'statistics.tx.packets':
            name = 'TX (packets)';
            scale = 1;
            break;
          default:
            break;
        }
        return {
          key: `network.physical.port.${this.state.selectedPortNr}.${k}`,
          title: name,
          scale: scale
        };
      }),
      mon.type
    );
    if (mon.type !== 'none' && mon.key !== 'none') {
      this.updateState();
      this.html('monitor-details-column', Template.MonitorSelected(this.state));
    }
  }

}

module.exports = Monitor;
