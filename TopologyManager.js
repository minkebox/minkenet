const EventEmitter = require('events');
const DeviceInstanceManager = require('./DeviceInstanceManager');
const DB = require('./Database');
const Debounce = require('./utils/Debounce');
const TopologyAnalyzer = require('./TopologyAnalyzer');
const Log = require('debug')('topology');


class TopologyManager extends EventEmitter {

  constructor() {
    super();
    this._entry = null;
    this._topology = [];
    this._order = [];
    this.valid = false;
    this.running = false;

    DeviceInstanceManager.on('update', Debounce(() => {
      if (!this.running) {
        this._buildLinkLags();
      }
    }));
  }

  getTopology() {
    return this._topology;
  }

  getAttachmentPoint() {
    return this._entry;
  }

  getCaptureDevices() {
    if (!this._entry) {
      return [];
    }
    // Get a list of all devices capable of capture
    const devices = DeviceInstanceManager.getAllDevices();
    const caps = {};
    devices.forEach(device => {
      if (device.readKV('network.mirror.0', { depth: 1 })) {
        caps[device._id] = device;
      }
    });
    // Make sure there's a capturable path from the attachment point to each device.
    for (let id in caps) {
      const path = this.findPath(this._entry.device, caps[id]);
      if (!path) {
        delete caps[id];
      }
      else {
        for (let i = 0; i < path.length; i++) {
          const link = path[i];
          if (!caps[link[0].device._id] || !caps[link[1].device._id]) {
            delete caps[id];
            break;
          }
        }
      }
    }
    // Return only devices we can capture from.
    return Object.values(caps);
  }

  // Find the path (a set of device/port to device/port links) between two devices.
  findPath(fromDevice, toDevice) {
    // Handle the empty path first.
    if (fromDevice === toDevice) {
      return [];
    }
    const walk = (from, to, links) => {
      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        if (link[0].device === from) {
          if (link[1].device === to) {
            return [ [ link[0], link[1] ] ];
          }
          else {
            const nlinks = [].concat(links);
            nlinks.splice(i, 1);
            const r = walk(link[1].device, to, nlinks);
            if (r) {
              r.unshift([ link[0], link[1] ] );
              return r;
            }
          }
        }
        else if (link[1].device === from) {
          if (link[0].device === to) {
            return [ [ link[1], link[0] ] ];
          }
          else {
            const nlinks = [].concat(links);
            nlinks.splice(i, 1);
            const r = walk(link[0].device, to, nlinks);
            if (r) {
              r.unshift([ link[1], link[0] ]);
              return r;
            }
          }
        }
      }
      return null;
    }
    return walk(fromDevice, toDevice, this._topology);
  }

  // Find the link from the device/port
  findLink(device, portnr) {
    for (let i = 0; i < this._topology.length; i++) {
      const link = this._topology[i];
      if (link[0].device === device && link[0].lag.ports.indexOf(portnr) !== -1) {
        // Return the link with the device:port first
        return link;
      }
      if (link[1].device === device && link[1].lag.ports.indexOf(portnr) !== -1) {
        return [ link[1], link[0] ];
      }
    }
    return null;
  }

  // Find the link associated with the device/lag
  findLinkLag(device, lagnr) {
    for (let i = 0; i < this._topology.length; i++) {
      const link = this._topology[i];
      if (link[0].device === device && link[0].lag.group === lagnr) {
        return link;
      }
      if (link[1].device === device && link[1].lag.group === lagnr) {
        return [ link[1], link[0] ];
      }
    }
    return null;
  }

  clear() {
    this._topology = [];
    this._entry = null;
    this.valid = false;
  }

  setLinkLag(link, type) {
    if (link[0].lag.type != type) {
      for (let i = 0; i < link.length; i++) {
        link[i].lag.type = type;
        let group = 0;
        if (type !== 'none') {
          group = link[i].device.readKV(`network.lags.port.${link[i].port}.group`);
          if (group === 0) {
            // Pick a new group.
            const lags = link[i].device.readKV(`network.lags`);
            const nr = lags.types[type] || 0;
            const available = {};
            for (let i = 1; i <= nr; i++) {
              available[i] = true;
            }
            for (let p in lags.port) {
              delete available[lags.port[p].group];
            }
            group = Object.keys(available)[0];
            if (group === undefined) {
              // No groups available
              throw new Error('no groups');
            }
          }
        }
        link[i].lag.ports.forEach(p => {
          link[i].device.writeKV(`network.lags.port.${p}.type`, type);
          link[i].device.writeKV(`network.lags.port.${p}.group`, group);
        });
      }
    }
  }

  addLinkDevicePort(link, device, portnr) {
    for (let i = 0; i < link.length; i++) {
      if (link[i].device === device && link[i].lag.ports.indexOf(portnr) === -1) {
        const lag = link[i].device.readKV(`network.lags.port.${link[i].port}`);
        if (!link[i].device.writeKV(`network.lags.port.${portnr}.type`, lag.type)) {
          return false;
        }
        link[i].device.writeKV(`network.lags.port.${portnr}.group`, lag.group);
        return true;
      }
    }
    return false;
  }

  removeLinkDevicePort(link, device, portnr) {
    for (let i = 0; i < link.length; i++) {
      if (link[i].device === device) {
        const idx = link[i].lag.ports.indexOf(portnr);
        if (idx !== -1) {
          link[i].device.writeKV(`network.lags.port.${portnr}.type`, 'none');
          link[i].device.writeKV(`network.lags.port.${portnr}.group`, 0);
          return true;
        }
      }
    }
    return false;
  }

  //
  // Read the LAG information for each link and build (or rebuild) the lag state.
  //
  _buildLinkLags() {
    // Build a mapping for each device from port to lag group.
    const dev2portmap = this._buildDevicesPortmap(DeviceInstanceManager.getAuthenticatedDevices());
    // Walk each link and add the appropriate lag information.
    let update = false;
    this._topology.forEach(link => {
      link.forEach(point => {
        const oldLag = JSON.stringify(point.lag);
        const portmap = dev2portmap[point.device._id];
        if (portmap) {
          const map = portmap[point.port];
          if (map) {
            point.lag = { type: map.type, ports: map.ports, group: map.group };
          }
          else {
            point.lag = { type: 'none', ports: [ point.port ], group: 0 };
          }
        }
        else {
          point.lag = { type: 'none', ports: [ point.port ], group: 0 };
        }
        if (JSON.stringify(point.lag) !== oldLag) {
          update = true;
        }
      });
    });
    if (update) {
      this.emit('update');
    }
  }

  //
  // Build an order for each node in the topology, with the entry node being the 0th.
  //
  _buildOrder() {
    const devices = DeviceInstanceManager.getAuthenticatedDevices();
    if (this._entry) {
      const order = [];
      devices.forEach(device => {
        const path = this.findPath(this._entry.device, device);
        order.push({ order: path ? path.length : Number.MAX_SAFE_INTEGER, device: device });
      });
      order.sort((a,  b) => a.order - b.order);
      this._order = order.map(value => value.device);
    }
    else {
      this._order = devices;
    }
  }

  order(devices, direction) {
    const ndevices = this._order.filter(dev => devices.indexOf(dev) !== -1);
    switch (direction) {
      case 'far-to-near':
        ndevices.reverse();
        break;
      case 'near-to-far':
      default:
        break;
    }
    return ndevices;
  }

  //
  // Build a device-to-portmap for all lags
  //
  _buildDevicesPortmap(devices) {
    const dev2portmap = {};
    devices.forEach(device => {
      const lags = device.readKV('network.lags');
      if (lags) {
        const portmap = {};
        const ports = lags.port;
        const groups = {};
        for (let p in ports) {
          if (ports[p].group) {
            const portnr = parseInt(p);
            const group = ports[p].group;
            if (group in groups) {
              groups[group].ports.push(portnr);
            }
            else {
              groups[group] = {
                type: ports[p].type,
                port: portnr,
                ports: [ portnr ],
                group: group
              };
            }
            portmap[portnr] = groups[group];
          }
        }
        dev2portmap[device._id] = portmap;
      }
    });
    //Log('portmap:', JSON.stringify(dev2portmap, null, 1));
    return dev2portmap;
  }

  cancel() {
    this.running = false;
    if (this.analyser) {
      this.analyser.stop();
      this.analyser.removeAllListeners();
      this.analyser = null;
    }
  }

  // Discover the topology of the network. This is how the switches
  // interconnect, but does not include any clients.
  async discoverNetworkTopology() {
    this.clear();

    this.analyser = new TopologyAnalyzer();
    this.analyser.on('status', event => this.emit('status', event));
    this.running = true;
    const results = await this.analyser.analyze();
    this.running = false;
    this.valid = results.success;
    if (!this.valid) {
      this.emit('status', { op: 'complete', success: false, reason: results.reason });
    }
    else {
      this._entry = results.entry;
      this._topology = results.topology;
      this._buildLinkLags();
      this._buildOrder();
      DB.updateTopology(this.toDB());
      this.emit('status', { op: 'complete', success: true, topology: this._topology });
      this.emit('update');
    }
  }

  toDB() {
    return {
      _id: 'topology',
      valid: this.valid,
      entry: this._entry ? { deviceId: this._entry.device._id, port: this._entry.port } : null,
      topology: this._topology.map(link => [
        { deviceId: link[0].device._id, port: link[0].port } , { deviceId: link[1].device._id, port: link[1].port }
      ])
    };
  }

  fromDB(dbTopology) {
    this.valid = false;
    if (dbTopology) {
      try {
        this._entry = { device: DeviceInstanceManager.getDeviceById(dbTopology.entry.deviceId), port: dbTopology.entry.port },
        this._topology = dbTopology.topology.map(link => {
          const d0 = DeviceInstanceManager.getDeviceById(link[0].deviceId);
          const d1 = DeviceInstanceManager.getDeviceById(link[1].deviceId);
          if (!d0 || !d1) {
            throw Error();
          }
          return [{ device: d0, port: link[0].port }, { device: d1, port: link[1].port }];
        });
        this.valid = dbTopology.valid;
      }
      catch (_) {
        // Failed to rebuild topology - device deleted?
        this._entry = null;
        this._topology = [];
        this.valid = false;
      }
    }
  }

  async start() {
    this.fromDB(await DB.getTopology());
    this._buildLinkLags();
    this._buildOrder();
    this._invalid = () => {
      this.valid = false;
      DB.updateTopology(this.toDB());
      this.emit('update');
    }
    DeviceInstanceManager.on('add', this._invalid);
    DeviceInstanceManager.on('remove', this._invalid);
  }

  stop() {
    DeviceInstanceManager.off('add', this._invalid);
    DeviceInstanceManager.off('remove', this._invalid);
  }
}

module.exports = new TopologyManager();
