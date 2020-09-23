const EventEmitter = require('events');
const OUI = require('oui');
const DeviceInstanceManager = require('./DeviceInstanceManager');
const DeviceState = require('./DeviceState');
const TopologyManager = require('./TopologyManager');
const DB = require('./Database');
const ARP = require('./discovery/arp');
const Debounce = require('./utils/Debounce');
const Log = require('debug')('clients');

const SCRUB_TIMER = 10 * 60 * 1000; // 10 minutes

class ClientManager extends EventEmitter {

  constructor() {
    super();
    this.mac = {};
    this.dev2mac = {};
  }

  async start() {

    const info = await DB.getAllMacs() || [];
    info.forEach(data => this.updateEntry(data._id, { name: data.name, firstSeen: data.firstSeen, lastSeen: data.lastSeen }));

    DeviceInstanceManager.on('update', Debounce(() => {
      this.updateDeviceClients();
    }));

    TopologyManager.on('update', () => {
      // Topology has changed, so we need to recalculate all the connection points.
      const devices = DeviceInstanceManager.getAuthenticatedDevices();
      for (let mac in this.mac) {
        this.mac[mac].connected = this.updateConnectionPoint(mac, devices);
        Log('update topology mac:', mac);
        this.emit('update.client', { mac: mac });
      }
    });

    this.arp = ARP.getInstance();
    this.arp.on('update', () => {
      this.updateArpClients();
    });

    this.arp.start();
    this.updateDeviceClients();

    this.scrubEntries = this.scrubEntries.bind(this);
    this._scrubTimer = setInterval(this.scrubEntries, SCRUB_TIMER);
    this.scrubEntries();
  }

  stop() {
    this.arp.stop();
    clearInterval(this._scrubTimer);
    this._scrubTimer = null;
  }

  async forgetClient(mac) {
    if (!this.mac[mac]) {
      return false;
    }
    await DB.removeMac(this.toDB(mac));
    delete this.mac[mac];
    for (let devid in this.dev2mac) {
      const dev2mac = this.dev2mac[devid];
      if (dev2mac[mac]) {
        delete dev2mac[mac];
      }
    }
    this.emit('update');
    return true;
  }

  async updateDeviceClients() {
    Log('update clients:');
    const devices = DeviceInstanceManager.getAuthenticatedDevices();
    for (let i = 0; i < devices.length; i++) {
      if (!this.dev2mac[devices[i]._id]) {
        this.dev2mac[devices[i]._id] = {};
      }
    }

    let change = false;
    for (let i = 0; i < devices.length; i++) {
      const dev = devices[i];
      const macs = dev.readKV('network.clients');
      const ndev2mac = {};
      const odev2mac = this.dev2mac[dev._id] || {};
      this.dev2mac[dev._id] = ndev2mac;
      for (let key in macs) {
        const info = macs[key];
        const mac = info.mac;
        change |= this.updateEntry(mac, info.ssid ? { ssid: info.ssid } : {});
        if (ndev2mac[mac]) {
          // Ignore mac on multiple ports for now
        }
        else {
          let portnr = info.portnr;
          if (String(portnr).indexOf('lag') === 0) {
            // Some devices report lags as being a port and so macs can appear on these virtual ports.
            // We map these to the base port on the lag itself which is how we track things.
            const link = TopologyManager.findLinkLag(dev, parseInt(portnr.substring(3)));
            if (!link) {
              continue;
            }
            portnr = link[0].port;
          }
          else {
            // Othewise, just map the port to the base port of the lag (if there is one)
            const link = TopologyManager.findLink(dev, portnr);
            if (link) {
              portnr = link[0].port;
            }
          }
          ndev2mac[mac] = { portnr: portnr };
          if (odev2mac[mac] && odev2mac[mac].portnr == ndev2mac[mac].portnr) {
            odev2mac[mac].keep = true;
          }
          else {
            change = true;
            this.mac[mac].connected = this.updateConnectionPoint(mac, devices);
            Log('update mac:', mac, portnr);
            this.emit('update.client', { mac: mac });
          }
        }
      }
      if (!change) {
        for (let key in odev2mac) {
          if (!odev2mac[key].keep) {
            change = true;
            break;
          }
        }
      }
    }
    if (change) {
      this.emit('update');
    }
  }

  async updateArpClients() {
    Log('update arp clients:');
    let change = false;
    const hosts = this.arp.getAddresses();
    for (let i = 0; i < hosts.length; i++) {
      const mac = hosts[i].txt.macAddress;
      const updated = this.updateEntry(mac, { ip: hosts[i].ip, hostname: hosts[i].txt.hostname });
      if (updated) {
        Log('update arp mac:', mac);
        change = true;
        this.emit('update.client', { mac: mac });
      }
    }
    if (change) {
      this.emit('update');
    }
  }

  updateEntry(addr, info) {
    const now = Date.now();
    let change = false;

    let entry = this.mac[addr];
    if (!entry) {
      const oui = OUI(addr);
      entry = {
        id: addr.replace(/:/g, '-'),
        mac: addr,
        ip: info.ip,
        hostname: info.hostname,
        name: info.name || '',
        ssid: info.ssid || '',
        firstSeen: info.firstSeen || now,
        lastSeen: info.lastSeen || now,
        instances: [],
        oui: oui ? oui.split('\n')[0] : null,
        connected: null
      };
      this.mac[addr] = entry;
      change = true;
    }
    else {
      for (let key in info) {
        if (key in entry && info[key] !== entry[key]) {
          change = true;
          entry[key] = info[key];
        }
      }
      entry.lastSeen = now;
    }
    if (change) {
      DB.updateMac(this.toDB(addr));
    }
    return change;
  }

  updateConnectionPoint(mac, devices) {
    Log('updateconnectionpoint:', mac);

    // Work out the most likely port this mac is attached to.
    // Quickly look through all the places we've been seen. If we find an instance which
    // isn't associated with a peer then this must be our port.
    for (let i = 0; i < devices.length; i++) {
      const device = devices[i];
      const instance = (this.dev2mac[device._id] || {})[mac];
      if (instance) {
        const peer = TopologyManager.findLink(device, instance.portnr);
        if (!peer) {
          // Mac detected on a device/port without a peer - so this is the port it connects to
          // (or via a device we dont know).
          return { device: device, portnr: instance.portnr };
        }
      }
    }

    // The quick look didn't work, which means we have incomplete information. This is often the case where
    // not all devices in a network report the clients they know. We will have to make our best guess.
    for (let i = 0; i < devices.length; i++) {
      // Dont check device we've been seen on (we know it wont be those otherwise the peer test would have found it)
      if (!(this.dev2mac[devices[i]._id] || {})[mac]) {
        let valid = true;
        for (let j = 0; j < devices.length && valid; j++) {
          const instance = (this.dev2mac[devices[j]._id] || {})[mac];
          if (instance) {
            const path = TopologyManager.findPath(devices[j], devices[i]);
            if (!path || path[0][0].port != instance.portnr) {
              valid = false;
            }
          }
        }
        if (valid) {
          return { device: devices[i], portnr: null };
        }
      }
    }
    return null;
  }

  scrubEntries() {
    let anychange = false;
    const before = Date.now() - 60 * 60 * 1000;
    for (let addr in this.mac) {
      let change = false;
      const entry = this.mac[addr];
      if (entry.lastSeen < before) {
        // Old entry. Clear transient info.
        if (entry.ip) {
          entry.ip = null;
          change = true;
        }
        if (entry.connected) {
          entry.connected = null;
          change = true;
        }
      }
      if (change) {
        DB.updateMac(this.toDB(addr));
        anychange = true;
      }
    }
    if (anychange) {
      this.emit('update');
    }
  }

  getClientsForDeviceAndPort(device, portnr) {
    const clients = [];
    const macs = this.dev2mac[device._id] || {};
    for (let addr in macs) {
      const client = macs[addr];
      if (client.portnr == portnr) {
        clients.push(this.mac[addr]);
      }
    }
    return clients;
  }

  getClientByMac(addr) {
    return this.mac[addr];
  }

  getClientByIP(address) {
    for (let addr in this.mac) {
      if (this.mac[addr].ip == address) {
        return this.mac[addr];
      }
    }
    return null;
  }

  getAllClients(filter) {
    const dmacs = filter === 'clients' ? this._getDeviceMacs() : {};
    const macs = {}
    for (let m in this.mac) {
      if (!dmacs[m]) {
        macs[m] = this.mac[m];
      }
    }
    return macs;
  }

  _getDeviceMacs() {
    const dmacs = {};
    DeviceInstanceManager.getAuthenticatedDevices().forEach(dev => {
      const macs = dev.readKV(DeviceState.KEY_SYSTEM_MACADDRESS);
      if (macs) {
        Object.values(macs).forEach(mac => dmacs[mac] = true);
      }
    });
    return dmacs;
  }

  async setName(mac, name) {
    this.mac[mac].name = name;
    await DB.updateMac(this.toDB(mac));
  }

  toDB(mac) {
    const m = this.mac[mac];
    return {
      _id: mac,
      name: m.name,
      firstSeen: m.firstSeen,
      lastSeen: m.lastSeen
    };
  }

  fromDB(mac, data) {
    const m = this.mac[mac];
    if (data) {
      for (let k in data) {
        if (k in m) {
          m[k] = data[k];
        }
      }
    }
  }

}

module.exports = new ClientManager();
