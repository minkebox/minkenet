const Template = require('../Template');
const VLANManager = require('../../VLANManager');
const DeviceInstanceManager = require('../../DeviceInstanceManager');
const TopologyManager = require('../../TopologyManager');
const Debounce = require('../../utils/Debounce');
const Config = require('../../Config');
const Page = require('../Page');
const Log = require('debug')('ui');

class Networks extends Page {

  constructor(send) {
    super(send);
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
      topologyValid: false,
      managementid: -1
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
        this.state.portnr = arg.portnr;
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
    this.state.ports = this.state.devices.map(dev => VLANManager.getVLANDeviceVLANPorts(dev, this.state.vid));
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
    if (Config.read('network.vlan.management')) {
      this.state.managementid = Config.read('network.vlan.managementid');
    }
    else {
      this.state.managementid = null;
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
    this.html('network-devices', Template.NetworkCardDevices(this.state));
    // Selected vlan name and id
    this.html('network-overview', Template.NetworkCardNetwork(this.state));
    // Vlan information for device port
    this.html('network-port', Template.NetworkCardPort(this.state));
  }

  onTopologyUpdate() {
    this.state.topologyValid = TopologyManager.valid;
    // Topology notice is at the top of the network list
    this.html('networks-column', Template.NetworkList(this.state));
  }

  'select.vlan' (msg) {
    this.updateState({ vid: msg.value });
    this.html('network-selected', Template.NetworkSelected(this.state));
  }

  'device.port.select' (msg) {
    this.updateState({ portnr: msg.value.port, device: DeviceInstanceManager.getDeviceById(msg.value.id) });
    // No vlan for this device - add this device to this vlan
    let autoroute = Config.read('network.vlan.autoroute');
    if (!this.state.vlan) {
      const vlan = VLANManager.getVLANDevice(this.state.device, true).getVLAN(this.state.vid, true);
      vlan.setName(this.state.selected.name);
      vlan.setPort(this.state.portnr, 'T');
    }
    else {
      const vlan = VLANManager.getVLANDeviceVLAN(this.state.device, this.state.vid);
      const tag = vlan.getPort(this.state.portnr);
      vlan.setName(this.state.selected.name);
      if (this.state.ldevice == this.state.device && this.state.lportnr == this.state.portnr) {
        const link = TopologyManager.findLink(this.state.device, this.state.portnr);
        switch (tag) {
          case 'X':
            vlan.setPort(this.state.portnr, 'T');
            if (link) {
              link[0].ports.forEach(portnr => vlan.setPort(portnr, 'T'));
            }
            break;
          case 'T':
            vlan.setPort(this.state.portnr, 'U');
            if (link) {
              link[0].ports.forEach(portnr => vlan.setPort(portnr, 'U'));
            }
            break;
          case 'U':
          default:
            vlan.setPort(this.state.portnr, 'X');
            if (link) {
              link[0].ports.forEach(portnr => vlan.setPort(portnr, 'X'));
            }
            autoroute = false;
            break;
        }
      }
      else {
        autoroute = false;
      }
    }
    if (autoroute) {
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
    this.updateState();
    this.html('network-overview', Template.NetworkCardNetwork(this.state));
    this.html('network-devices', Template.NetworkCardDevices(this.state));
    this.html('network-port', Template.NetworkCardPort(this.state));
  }

  async 'device.port.tag' (msg) {
    const vlan = VLANManager.getVLANDeviceVLAN(this.state.device, this.state.vid);
    const tag = (msg.value.v === 'Keep tag' ? 'T' : 'U');
    TopologyManager.findLink(this.state.device, this.state.portnr)[0].ports.forEach(portnr => vlan.setPort(portnr, tag));
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
    this.html('network-devices', Template.NetworkCardDevices(this.state));
    this.html('network-overview', Template.NetworkCardNetwork(this.state));
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

}

module.exports = Networks;
