const Template = require('../Template');
const ClientManager = require('../../ClientManager');
const TopologyManager = require('../../TopologyManager');
const Page = require('../Page');

class Clients extends Page {

  constructor(send) {
    super(send);
    this.state = {
      clients: null,
      selected: null,
      yesterday: null
    };

    this.onUpdateClient = this.onUpdateClient.bind(this);
  }

  select() {
    super.select();
    this.state.clients = ClientManager.getAllClients();
    for (const mac in this.state.clients) {
      this.selectMac(mac);
      break;
    }
    this.state.yesterday =  Date.now() - 24 * 60 * 60 * 1000;

    this.state.topologyValid = TopologyManager.valid;
    ClientManager.on('update.client', this.onUpdateClient);

    this.html('main-container', Template.ClientsTab(this.state));
  }

  deselect() {
    ClientManager.off('update.client', this.onUpdateClient);
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
    }
    else {
      this.state.portid = null;
      this.state.portname = null;
      this.state.portnamekv = null;
      this.state.porthighlights = [];
    }
  }

  async 'select.client' (msg) {
    this.selectMac(msg.value);
    this.html('clients-selected', Template.ClientsSelected(this.state));
  }

  async 'kv.update' (msg) {
    this.state.selected.connected.device.writeKV(msg.value.k, msg.value.v);
  }

  async 'client.name' (msg) {
    ClientManager.setName(msg.value.k, msg.value.v);
    this.html(`mac-${msg.value.k.replace(/:/g, '-')}`, Template.ClientsSummary(this.state.selected));
  }

}

module.exports = Clients;
