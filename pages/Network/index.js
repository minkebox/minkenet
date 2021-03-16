const Template = require('../Template');
const VLANManager = require('../../VLANManager');
const DeviceInstanceManager = require('../../DeviceInstanceManager');
const TopologyManager = require('../../TopologyManager');
const ClientManager = require('../../ClientManager');
const Debounce = require('../../utils/Debounce');
const Config = require('../../Config');
const Page = require('../Page');
const Log = require('debug')('ui');

class Networks extends Page {

  constructor(root) {
    super(root);
    this.state = {
      vid: 1,
      device: null,
      port: null,
      portnr: 0,
      networks: null,
      phantoms: [],
      selected: null,
      devices: null,
      vlan: null,
      ports: null,
      othervlans: null,
      lvid: null,
      ldevice: null,
      lportnr: null,
      topologyValid: false
    };

    this.onNetworkUpdate = Debounce(this.onNetworkUpdate, this);
    this.onTopologyUpdate = Debounce(this.onTopologyUpdate, this);
  }

  updateState(arg) {
    if (arg) {
      if ('vid' in arg) {
        this.state.lvid = this.state.vid;
        this.state.vid = arg.vid;
      }
      if ('device' in arg) {
        this.state.ldevice = this.state.device;
        this.state.device = arg.device;
      }
      if ('portnr' in arg) {
        this.state.lportnr = this.state.portnr;
        this.state.portnr = parseInt(arg.portnr);
      }
    }
    this.state.port = this.state.device && this.state.device.readKV(`network.physical.port.${this.state.portnr}`);
    this.state.networks = VLANManager.getAllVLANs();
    this.state.phantoms.forEach(vlan => {
      if (!this.state.networks.find(net => net.id == vlan.id)) {
        this.state.networks.push(vlan);
      }
    });
    this.state.selected = this.state.networks.find(vlan => vlan.id == this.state.vid);
    this.state.devices = DeviceInstanceManager.getAuthenticatedDevices();
    this.state.ports = this.state.devices.map(dev => [].concat(VLANManager.getVLANDeviceVLANPorts(dev, this.state.vid)));
    this.state.peer = null;
    if (this.state.port) {
      const didx = this.state.devices.indexOf(this.state.device);
      const p = this.state.ports[didx];
      if (!p[this.state.portnr] || p[this.state.portnr] === 'X') {
        p[this.state.portnr] = 'S';
      }
      const macs = ClientManager.getClientsForDeviceAndPort(this.state.device, this.state.portnr);
      if (macs.length === 0) {
        this.state.peer = null;
      }
      else if (macs.length === 1) {
        this.state.peer = macs[0].name || macs[0].hostname;
      }
      else {
        const peer = TopologyManager.findLink(this.state.device, this.state.portnr);
        if (peer) {
          this.state.peer = `${peer[1].device.name}, port ${peer[1].port + 1}`;
        }
        else {
          const mac = macs.find(mac => mac.name || mac.hostname);
          this.state.peer = mac ? `${mac.name || mac.hostname}, ...` : null;
        }
      }
    }

    const vdev = VLANManager.getVLANDevice(this.state.device);
    if (!vdev) {
      this.state.vlan = null;
      this.state.othervlans = null;
    }
    else {
      this.state.vlan = vdev.getVLAN(this.state.vid);
      this.state.othervlans = vdev.getVLANsForPort(this.state.portnr).map(vlan => vlan.vid).filter(vid => vid != this.state.vid).join(', ');
    }
    if (Config.read('network.vlan.autoroute')) {
      this.state.topologyValid = TopologyManager.valid;
    }
    else {
      this.state.topologyValid = true; // hide
    }
  }

  select() {
    super.select();
    VLANManager.on('update', this.onNetworkUpdate);
    TopologyManager.on('update', this.onTopologyUpdate);
    this.updateState();
    this.html('main-container', Template.NetworkTab(this.state));
  }

  deselect() {
    VLANManager.off('update', this.onNetworkUpdate);
    TopologyManager.off('update', this.onTopologyUpdate);
  }

  onNetworkUpdate() {
    this.updateState();
    // List of networks names and vlan ids
    this.html('networks-column', Template.NetworkList(this.state));
    // Pictures of devices with vlans highlighted
    this.html('network-devices', Template.PortsDevices(this.state));
    // Selected vlan name and id
    this.html('network-overview', Template.NetworkNetwork(this.state));
    // Vlan information for device port
    this.html('network-port', Template.NetworkPort(this.state));
  }

  onTopologyUpdate() {
    this.state.topologyValid = TopologyManager.valid;
    // Topology notice is at the top of the network list
    this.html('networks-column', Template.NetworkList(this.state));
  }

  'select.vlan' (msg) {
    this.updateState({ vid: parseInt(msg.value) });
    this.html('network-selected', Template.NetworkSelected(this.state));
    this.html('networks-column', Template.NetworkList(this.state));
  }

  'device.port.select' (msg) {
    this.updateState({ portnr: msg.value.port, device: DeviceInstanceManager.getDeviceById(msg.value.id) });
    this.html('network-devices', Template.PortsDevices(this.state));
    this.html('network-port', Template.NetworkPort(this.state));
  }

  async 'device.port.tag' (msg) {
    const vlan = VLANManager.getVLANDeviceVLAN(this.state.device, this.state.vid);
    let tag;
    switch (msg.value.v) {
      case 'Keep tag':
        tag = 'T';
        break;
      case 'Tag incoming, Untag exiting':
        tag = 'U';
        break;
      case 'None':
      default:
        tag = 'X';
        break;
    }

    if (TopologyManager.valid) {
      // If we're setting a port which is part of a lag, we set all the ports on the lag
      const link = TopologyManager.findLink(this.state.device, this.state.portnr);
      if (link) {
        Log(link[0].device.name, link[0].lag);
        link[0].lag.ports.forEach(portnr => vlan.setPort(portnr, tag));
      }
      // Otherwise, just the port itself
      else {
        Log(this.state.device.name, this.state.portnr, tag);
        vlan.setPort(this.state.portnr, tag);
      }

      const autoroute = Config.read('network.vlan.autoroute');
      if (autoroute && tag !== 'X') {
        // If autoroute is enable, make sure we have a vlan built from this device to others with this vlan
        const others = VLANManager.getVLANDevices(this.state.vid);
        if (others.length >= 2) {
          const path = TopologyManager.findPath(others[0] !== this.state.device ? others[0] : others[1], this.state.device) || [];
          path.forEach(link => {
            Log(link[0].device.name, link[0].lag, '<->', link[1].device.name, link[1].lag);
            const fv = VLANManager.getVLANDeviceVLAN(link[0].device, this.state.vid, true);
            const tv = VLANManager.getVLANDeviceVLAN(link[1].device, this.state.vid, true);
            link[0].lag.ports.forEach(p => fv.setPort(p, 'T'));
            link[1].lag.ports.forEach(p => tv.setPort(p, 'T'));
          });
        }
      }
    }
    else {
      const vlan = VLANManager.getVLANDevice(this.state.device, true).getVLAN(this.state.vid, true);
      vlan.setPort(this.state.portnr, tag);
    }

    this.updateState();
    this.html('network-devices', Template.PortsDevices(this.state));
  }

  async 'network.vlan.create' (msg) {
    let id = parseInt(msg.value.id) || 0;
    let name = msg.value.name;
    if (!id) {
      // Find next available id
      id = 1 + this.state.networks.reduce((max, vlan) => Math.max(max, vlan.id), 0);
    }
    else {
      // Dont create a vlan if we already have it.
      if (this.state.networks.find(vlan => vlan.id == id) || this.state.phantoms.find(vlan => vlan.id == id)) {
        return;
      }
    }
    if (!name) {
      // Default name
      name = `VLAN ${id}`;
    }
    this.state.phantoms.push({ id: id, name: name });
    this.updateState({ vid: id });
    this.html('networks-column', Template.NetworkList(this.state));
    this.html('network-devices', Template.PortsDevices(this.state));
    this.html('network-overview', Template.NetworkNetwork(this.state));
  }

  async 'network.vlan.update' (msg) {
    switch (msg.value.k) {
      case 'name':
        const name = msg.value.v;
        this.state.selected.name = name;
        VLANManager.getVLANDevices(this.state.vid).forEach(device => {
          VLANManager.getVLANDeviceVLAN(device, this.state.vid).setName(name);
        });
        this.html('networks-column', Template.NetworkList(this.state));
        break;
      case 'id':
        break;
      default:
        break;
    }
  }

  async 'network.vlan.delete' (msg) {
    const vid = parseInt(msg.value);
    // Cannot delete default/management vlan
    if (vid === 1) {
      return;
    }
    // Sanity check
    if (vid !== this.state.vid) {
      return;
    }

    VLANManager.deleteVLAN(this.state.vid);

    this.updateState({ vid: 1 });
    this.html('networks-column', Template.NetworkList(this.state));
    this.html('network-devices', Template.PortsDevices(this.state));
    this.html('network-overview', Template.NetworkNetwork(this.state));
  }

}

module.exports = Networks;
