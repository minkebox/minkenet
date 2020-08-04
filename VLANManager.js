const EventEmitter = require('events');
const DeviceInstanceManager = require('./DeviceInstanceManager');
const TypeConversion = require('./utils/TypeConversion');
const Debounce = require('./utils/Debounce');
const { devices } = require('./DeviceManager');
const Log = require('debug')('vlan');

const DEFAULT_VLAN = 1;

class VLAN extends EventEmitter {

  constructor(device, vid, nrports) {
    super();
    this.device = device;
    this.vid = vid;
    this.name = '';
    this.ports = Array(nrports).fill('X');
  }

  getPort(portnr) {
    return this.ports[portnr];
  }

  setPort(portnr, tag) {
    if (this.ports[portnr] === tag) {
      return;
    }
    const options = { create: true };
    this.ports[portnr] = tag;
    if (tag === 'X') {
      if (!this.ports.find(p => p !== 'X')) {
        this.device.deleteKV(`network.vlans.vlan.${this.vid}`);
      }
      else {
        this.device.deleteKV(`network.vlans.vlan.${this.vid}.port.${portnr}`);
      }
      if (this.device.readKV(`network.vlans.pvid.${portnr}.pvid`) === this.vid) {
        this.device.writeKV(`network.vlans.pvid.${portnr}.pvid`, DEFAULT_VLAN);
      }
    }
    else {
      if (!this.device.readKV(`network.vlans.vlan.${this.vid}`)) {
        this.device.writeKV(`network.vlans.vlan.${this.vid}`, {}, options);
        this.device.writeKV(`network.vlans.vlan.${this.vid}.port`, {}, options);
        this.device.writeKV(`network.vlans.vlan.${this.vid}.name`, this.name, options);
      }
      this.device.writeKV(`network.vlans.vlan.${this.vid}.port.${portnr}`, {}, options);
      this.device.writeKV(`network.vlans.vlan.${this.vid}.port.${portnr}.tagged`, (tag === 'T'), options);
      if (tag === 'U') {
        this.device.writeKV(`network.vlans.pvid.${portnr}.pvid`, this.vid);
      }
    }
    this.emit('update');
  }

  getName() {
    return this.name;
  }

  setName(name) {
    if (this.name != name) {
      this.name = name;
      // This will only succeed if the VLAN has already been created, which is fine because we don't
      // want to create an empty VLAN just to name it.
      this.device.writeKV(`network.vlans.vlan.${this.vid}.name`, this.name);
      this.emit('update');
    }
  }
}

class VLANDevice extends EventEmitter {

    constructor(device) {
      super();
      this.device = device;
      this.vlans = {};
      const ports = device.readKV(`network.physical.port`, { depth: 1 });
      this.nrports = Object.keys(ports || {}).length;

      this.onUpdate = this.onUpdate.bind(this);
    }

    onUpdate() {
      this.emit('update');
    }

    getVLAN(vid, create) {
      let vlan = this.vlans[vid];
      if (!vlan && create) {
        vlan = new VLAN(this.device, vid, this.nrports);
        this.vlans[vid] = vlan;
        vlan.on('update', this.onUpdate);
        this.emit('update');
      }
      return vlan;
    }

    deleteVLAN(vid) {
      const vlan = this.vlans[vid];
      if (vlan) {
        vlan.off('update', this.onUpdate);
        delete this.vlans[vid];
        this.emit('update');
      }
    }

    getVLANsForPort(portnr) {
      const vlans = [];
      for (let vlan in this.vlans) {
        if (this.vlans[vlan].ports[portnr] !== 'X') {
          vlans.push(this.vlans[vlan]);
        }
      }
      return vlans;
    }
}

class VLANManager extends EventEmitter {

  constructor() {
    super();
    this.vland = {};

    this.onUpdate = this.onUpdate.bind(this);
  }

  onUpdate() {
    this.emit('update');
  }

  start() {
    this.deviceUpdate = Debounce(() => {
      this.updateVLANs();
    });
    DeviceInstanceManager.on('update', this.deviceUpdate);
    this.updateVLANs();
  }

  stop() {
    DeviceInstanceManager.off('update', this.deviceUpdate);
  }

  getVLANDevice(device, create) {
    if (!device) {
      return null;
    }
    let vland = this.vland[device._id];
    if (!vland && create) {
      vland = new VLANDevice(device);
      this.vland[device._id] = vland;
      vland.on('update', this.onUpdate);
      this.emit('update');
    }
    return vland;
  }

  // Helper
  getVLANDeviceVLAN(device, vid, create) {
    const vdev = this.getVLANDevice(device, create);
    if (!vdev) {
      return null;
    }
    return vdev.getVLAN(vid, create);
  }

  // Helper
  getVLANDeviceVLANPorts(device, vid, create) {
    const vlan = this.getVLANDeviceVLAN(device, vid, create);
    if (!vlan) {
      return null;
    }
    return vlan.ports;
  }

  getVLANDevices(vid) {
    const devices = [];
    for (let vdev in this.vland) {
      if (vid in this.vland[vdev].vlans) {
        devices.push(this.vland[vdev].device);
      }
    }
    return devices;
  }

  getAllVLANs() {
    const vlans = {};
    for (let vdev in this.vland) {
      for (let vlan in this.vland[vdev].vlans) {
        if (!vlans[vlan]) {
          vlans[vlan] = { id: vlan, name: this.vland[vdev].vlans[vlan].name };
        }
        if (!vlans[vlan].name) {
          vlans[vlan].name = this.vland[vdev].vlans[vlan].name;
        }
      }
    }
    return Object.values(vlans);
  }

  updateVLANs() {
    Log('updatevlans:');
    DeviceInstanceManager.getAuthenticatedDevices().forEach(dev => {
      const vids = dev.readKV('network.vlans.vlan', { depth: 1 }) || {};
      const dvlan = this.getVLANDevice(dev, true);
      const ovlans = Object.assign({}, dvlan.vlans);
      for (let v in vids) {
        const vid = parseInt(v);
        delete ovlans[vid];
        const vlan = dvlan.getVLAN(vid, true);
        const vdata = dev.readKV(`network.vlans.vlan.${vid}`);
        vlan.setName(vdata.name || '');
        for (let portnr = 0; portnr < dvlan.nrports; portnr++) {
          if (portnr in vdata.port) {
            vlan.setPort(portnr, TypeConversion.toBoolean(vdata.port[portnr].tagged) ? 'T' : 'U');
          }
          else {
            vlan.setPort(portnr, 'X');
          }
        }
      }
      for (let vid in ovlans) {
        dvlan.deleteVLAN(vid);
      }
    });
  }

}

module.exports = new VLANManager();
