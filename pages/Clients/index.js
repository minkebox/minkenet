const Template = require('../Template');
const ClientManager = require('../../ClientManager');
const TopologyManager = require('../../TopologyManager');
const Page = require('../Page');
const Log = require('debug')('clients');

class Clients extends Page {

  constructor(root) {
    super(root);
    this.state = {
      clients: null,
      sortedclients: null,
      selected: null,
      yesterday: null,
      capture: null,
      filter: '',
      type: null
    };

    this.onUpdateClient = this.onUpdateClient.bind(this);
  }

  select() {
    super.select();

    this.state.yesterday = Date.now() - 24 * 60 * 60 * 1000;
    this.state.topologyValid = TopologyManager.valid;

    ClientManager.on('update.client', this.onUpdateClient);
  }

  deselect() {
    ClientManager.off('update.client', this.onUpdateClient);
  }

  tabSelect(tab, arg) {
    switch (tab) {
      case 'new':
        this.state.type = 'new';
        break;
      case 'blocked':
        this.state.type = 'blocked';
        break;
      case 'limited':
        this.state.type = 'limited';
        break;
      case 'all':
      default:
        this.state.type = null;
        break;
    }

    this.updateClients();
    this.html('main-container', Template.ClientsTab(this.state));
  }

  onUpdateClient(evt) {
    this.html(`mac-${evt.mac.replace(/:/g, '-')}`, Template.ClientsSummary(this.state.clients[evt.mac]));
    if (this.state.selected && evt.mac === this.state.selected.mac) {
      this.html('clients-selected', Template.ClientsSelected(this.state));
    }
  }

  selectMac(mac) {
    this.state.selected = this.state.clients[mac];
    const portnr = this.state.selected.connected && this.state.selected.connected.portnr;
    if (typeof portnr == 'number') {
      this.state.portid = this.state.selected.connected.device.readKV(`network.physical.port.${portnr}.id`);
      this.state.portname = this.state.selected.connected.device.readKV(`network.physical.port.${portnr}.name`);
      this.state.portnamekv = `network.physical.port.${portnr}.name`;
      this.state.porthighlights = [];
      this.state.porthighlights[portnr] = 'A';
      const macs = ClientManager.getClientsForDeviceAndPort(this.state.selected.connected.device, portnr);
      this.state.single = macs.length === 1 ? true : false;
    }
    else {
      this.state.portid = null;
      this.state.portname = null;
      this.state.portnamekv = null;
      this.state.porthighlights = [];
      this.state.single = false;
    }
    this.state.capture = this.getCapture(mac);
  }

  async 'select.client' (msg) {
    this.selectMac(msg.value);
    this.html('clients-selected', Template.ClientsSelected(this.state));
  }

  async 'kv.update' (msg) {
    this.state.selected.connected.device.writeKV(msg.value.k, msg.value.v);
  }

  async 'update.name' (msg) {
    ClientManager.setName(msg.value.k, msg.value.v);
    this.html(`mac-${msg.value.k.replace(/:/g, '-')}`, Template.ClientsSummary(this.state.selected));
  }

  async 'update.ingress' (msg) {
    ClientManager.setIngress(msg.value.k, parseInt(msg.value.v));
  }

  async 'update.egress' (msg) {
    ClientManager.setEgress(msg.value.k, parseInt(msg.value.v));
  }

  async 'update.blocked' (msg) {
    ClientManager.setBlocked(msg.value.k, !!msg.value.v);
  }

  async 'client.filter' (msg) {
    this.state.filter = msg.value.v;
    this.updateClients();
    if (!this.state.selected) {
      this.html('clients-selected', Template.ClientsSelected(this.state));
    }
    this.html('clients-list', Template.ClientsList(this.state));
  }

  async 'client.forget' (msg) {
    await ClientManager.forgetClient(msg.value);
    this.updateClients();
    this.html('clients-list', Template.ClientsList(this.state));
    this.html('clients-selected', Template.ClientsSelected(this.state));
  }

  async 'client.capture' (msg) {
    if (this.state.capture) {
      this.switchPage('networks.capture', this.state.capture);
    }
  }

  updateClients() {
    const filter = this.state.filter.toLowerCase();
    if (!filter && !this.state.type) {
      this.state.clients = ClientManager.getAllClients();
    }
    else {
      this.state.clients = ClientManager.getFilteredClients({
        mac: filter,
        ip: filter,
        hostname: filter,
        name: filter,
        ssid: filter,
        oui: filter,
        connection: filter,
        wifi: filter === 'wifi',
        wired: filter === 'wired',
        onlyNew: this.state.type === 'new',
        onlyBlocked: this.state.type === 'blocked',
        onlyLimited: this.state.type === 'limited'
      });
    }
    if (this.state.selected && !this.state.clients[this.state.selected.mac]) {
      this.state.selected = null;
    }
    this.state.sortedclients = Object.values(this.state.clients);
    this.state.sortedclients.sort((a, b) => b.lastSeen - a.lastSeen);
  }

  getCapture(mac) {
    Log('getCapture:', mac);
    if (this.root.needCommit) {
      Log('getCapture: pending commit');
      return null;
    }
    const selected = this.state.clients[mac];
    if (!selected.connected) {
      Log('getCapture: no connection');
      return null;
    }
    const device = selected.connected.device;
    // If client is connected directly to a port, then it's easy to capture traffic to/from it
    if (typeof selected.connected.portnr === 'number') {
      Log('getCapture: direct connection');
      return {
        device: device,
        portnr: selected.connected.portnr,
        capture: {
          freeform: `ether host ${mac}`,
          ignoreBroadcast: true,
          ignoreMulticast: true,
          ignoreHost: true
        }
      };
    }
    // If not, if client is connected to an AP, we may be able to capture trafic to/from the AP either directly
    // or on the switch connected to the AP.
    if (!device.description.properties.ap) {
      Log('getCapture: not ap', device.description.properties);
      return null;
    }
    // AP must have a single port to capture from
    if (device.readKV('network.physical.ports.nr.total') != 1) {
      Log('getCapture: too many ports');
      return null;
    }
    const captures = TopologyManager.getCaptureDevices();
    if (captures.indexOf(device) !== -1) {
      Log('getCapture: on ap');
      return {
        device: device,
        portnr: 0,
        capture: {
          freeform: `ether host ${mac}`,
          ignoreBroadcast: true,
          ignoreMulticast: true,
          ignoreHost: true
        }
      };
    }
    // Cant capture on the AP, but maybe on the switch it's connected to.
    const link = TopologyManager.findLink(device, 0);
    if (link && captures.indexOf(link[1].device) !== -1) {
      Log('getCapture: on switch');
      return {
        device: link[1].device,
        portnr: link[1].port,
        capture: {
          freeform: `ether host ${mac}`,
          ignoreBroadcast: true,
          ignoreMulticast: true,
          ignoreHost: true
        }
      };
    }
    // No capture possible
    return null;
  }

}

module.exports = Clients;
