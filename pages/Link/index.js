const Template = require('../Template');
const Page = require('../Page');
const DeviceInstanceManager = require('../../DeviceInstanceManager');
const TopologyManager = require('../../TopologyManager');
const Debounce = require('../../utils/Debounce');
const VLANManager = require('../../VLANManager');
const Log = require('debug')('links');

class Links extends Page {

  constructor(root) {
    super(root);
    this.state = {
      devices: null,
      links: null,
      ports: null,
      selected: null,
      lag: null
    };

    this.topologyStatus = Debounce(this.topologyStatus, this);
    this.topologyUpdate = Debounce(this.topologyUpdate, this);
  }

  select() {
    super.select();
    TopologyManager.on('update', this.topologyUpdate);
    this.state.selectedIndex = 0;
    this.updateState();
    this.html('main-container', Template.LinkTab(this.state));

    if (Log.enabled) {
      Log('select:');
      Log(this.state.links.map(l => JSON.stringify([ [ l[0].device.name, l[0].lag ], [ l[1].device.name, l[1].lag ] ])));
    }
  }

  deselect() {
    super.deselect();
    TopologyManager.off('update', this.topologyUpdate);
  }

  updateState() {
    this.state.devices = DeviceInstanceManager.getAuthenticatedDevices();
    this.state.topologyValid = TopologyManager.valid;
    this.state.links = TopologyManager.getTopology();
    this.state.selected = this.state.links[this.state.selectedIndex];
    this.state.ports = Array(this.state.devices.length);
    const options = {
      active: true,
      static: true,
    };
    let lag = false;
    if (this.state.selected) {
      const highs = Array(this.state.selected.length);
      for (let i = 0; i < this.state.selected.length; i++) {
        const point = this.state.selected[i];
        const highlights = [];
        this.state.ports[this.state.devices.indexOf(point.device)] = highlights;
        highlights.active = 'A';
        point.lag.ports.forEach(port => highlights[port] = 'A');
        lag = point.lag.type !== 'none';
        const lags = point.device.readKV('network.lags.types') || {};
        for (let type in options) {
          if ((lags[type] || 0) == 0) {
            delete options[type];
          }
        }
        highs[i] = highlights;
      }

      const count0 = highs[0].reduce((p, c) => p + (c === 'A' ? 1 : 0), 0);
      const count1 = highs[1].reduce((p, c) => p + (c === 'A' ? 1 : 0), 0);
      if (count0 !== count1) {
        highs[0].active = 'B';
        highs[1].active = 'B';
      }
    }

    this.state.lag = 'none';
    if (this.state.selected && this.state.selected[0].lag) {
      this.state.lag = this.state.selected[0].lag.type;
    }
    this.state.options = [ { name: 'none', enabled: !lag } ].concat(
      Object.keys(options).map(n => { return { name: n, enabled: lag } })
    );
  }

  async 'link.select' (msg) {
    this.state.selectedIndex = msg.value;
    this.updateState();
    this.html('bonds-selected', Template.LinkSelected(this.state));
  }

  async 'lag.select' (msg) {
    this.state.lag = msg.value;
    TopologyManager.setLinkLag(this.state.selected, this.state.lag);
  }

  async 'device.port.select' (msg) {
    // If we have no lag options (only option is 'none') then don't let any ports get set.
    if (this.state.options.length === 1) {
      return;
    }
    // The currently selected device.
    const device = DeviceInstanceManager.getDeviceById(msg.value.id);
    if (this.state.selected[0].device !== device && this.state.selected[1].device !== device) {
      return;
    }
    const portnr = parseInt(msg.value.port);

    const didx = this.state.devices.indexOf(device);
    const dcount = this.state.ports[didx].reduce((p, c) => p + (c === 'A' ? 1 : 0), 0);
    const point = (this.state.selected[0].device === device ? this.state.selected[0] : this.state.selected[1]);

    // Cannot remove the last port on a device
    if (dcount === 1 && this.state.ports[didx][portnr] === 'A') {
      return;
    }

    if (this.state.ports[didx][portnr] !== 'A') {
      // Adding a port, or creating a lag if this wasn't one already
      if (this.state.lag === 'none') {
        TopologyManager.setLinkLag(this.state.selected, this.state.options[1].name);
      }
      TopologyManager.addLinkDevicePort(this.state.selected, device, portnr);
      // Copy the VLAN state from the 'base' port to the new port - they should match.
      const vdev = VLANManager.getVLANDevice(device);
      if (vdev) {
        const baseport = point.ports[0];
        vdev.getVLANsForPort(baseport).forEach(vlan => vlan.setPort(portnr, vlan.getPort(baseport)));
      }
    }
    else {
      // Removing a port, or removing a lag if we're down to one port on each end.
      if (dcount === 2) {
        const oidx = this.state.devices.indexOf(device === this.state.selected[0].device ? this.state.selected[1].device : this.state.selected[0].device);
        const ocount = this.state.ports[oidx].reduce((p, c) => p + (c === 'A' ? 1 : 0), 0);
        if (ocount === 1) {
          TopologyManager.setLinkLag(this.state.selected, 'none');
        }
      }
      TopologyManager.removeLinkDevicePort(this.state.selected, device, portnr);
      // Remove port from any vlans on this lag.
      const vdev = VLANManager.getVLANDevice(device);
      if (vdev) {
        vdev.getVLANsForPort(point.ports[0]).forEach(vlan => vlan.setPort(portnr, 'X'));
      }
    }
  }

  topologyUpdate() {
    this.updateState();
    this.html('main-container', Template.LinkTab(this.state));
  }

  //
  // Topology analysis
  //

  topologyStatus(evt) {
    this.html('topology-update', Template.LinkTopologyStatus(evt));
    if (evt.op === 'complete') {
      this.html('topology-analyze-primary', '');
      this.html('topology-analyze-secondary', 'Done');
    }
  }

  async 'topology.analyze' (msg) {
    switch (msg.value) {
      case 'start':
        if (!TopologyManager.running) {
          (async () => {
            TopologyManager.on('status', this.topologyStatus);
            await TopologyManager.discoverNetworkTopology();
            TopologyManager.off('status', this.topologyStatus);
          })();
        }
        break;
      case 'stop':
        if (TopologyManager.running) {
          TopologyManager.cancel();
        }
        this.state.topologyValid = TopologyManager.valid;
        this.html('bond-devices', Template.DeviceListAll(this.state));
        setTimeout(() => {
          this.html('topology-analyze-container', Template.LinkTopology());
        }, 1000);
        break;
      default:
        break;
    }
  }
}

module.exports = Links;
