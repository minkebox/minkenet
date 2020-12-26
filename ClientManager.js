const EventEmitter = require('events');
const OUI = require('oui');
const DeviceInstanceManager = require('./DeviceInstanceManager');
const DeviceState = require('./DeviceState');
const TopologyManager = require('./TopologyManager');
const DB = require('./Database');
const ARP = require('./discovery/arp');
const Debounce = require('./utils/Debounce');
const Log = require('debug')('clientmanager');

const SCRUB_TIMER = 10 * 60 * 1000; // 10 minutes

class ClientManager extends EventEmitter {

  constructor() {
    super();
    this.mac = {};
  }

  async start() {

    ((await DB.getAllMacs()) || []).forEach(data => {
      this.updateEntry(data._id, { name: data.name, firstSeen: data.firstSeen, lastSeen: data.lastSeen });
    });

    DeviceInstanceManager.on('update', Debounce(() => {
      this.updateDeviceClients();
    }));

    TopologyManager.on('update', () => {
      // Topology has changed, so we need to recalculate all the connection points.
      this.updateDeviceClients();
    });

    this.arp = ARP.getInstance();
    this.arp.on('update', () => {
      this.updateArpClients();
    });
    this.arp.start();

    this._scrubTimer = setInterval(() => {
      this.updateDeviceClients();
      this.scrubEntries();
    }, SCRUB_TIMER);

    this.updateDeviceClients();
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
    this.emit('update');
    return true;
  }

  async updateDeviceClients() {
    Log('update clients:');
    let change = false;
    // Build a map of device:portnr to quickly identify clients which
    // are just connected to other parts of the network.
    const net = {};
    TopologyManager.getTopology().forEach(link => {
      net[`${link[0].device._id}:${link[0].port}`] = true;
      net[`${link[1].device._id}:${link[1].port}`] = true;
    });
    const devices = DeviceInstanceManager.getAuthenticatedDevices();
    for (let i = 0; i < devices.length; i++) {
      const device = devices[i];
      const clients = device.readKV('network.clients');
      for (let id in clients) {
        const client = clients[id];
        let portnr = client.portnr;
        if (String(portnr).indexOf('lag') === 0) {
          // Some devices report lags as being a port and so macs can appear on these virtual ports.
          // We map these to the base port on the lag itself which is how we track things.
          const link = TopologyManager.findLinkLag(device, parseInt(portnr.substring(3)));
          if (!link) {
            continue;
          }
          portnr = link[0].port;
        }
        else {
          // Othewise, just map the port to the base port of the lag (if there is one)
          const link = TopologyManager.findLink(device, portnr);
          if (link) {
            portnr = link[0].port;
          }
        }
        const update = {};
        if (client.ip) {
          update.ip = client.ip;
        }
        if (client.hostname) {
          update.hostname = client.hostname;
        }
        if (client.ssid) {
          update.ssid = client.ssid;
          update.connected = { device: device, portnr: client.ssid };
          update.limited = null;
          update.blocked = null;
        }
        else if (!net[`${device._id}:${portnr}`]) {
          update.connected = { device: device, portnr: portnr };
          const port = device.readKV(`network.physical.port.${portnr}`);
          if (port.limit) {
            update.limited = {
              ingress: port.limit.ingress,
              egress: port.limit.egress
            };
          }
          if ('enable' in port) {
            update.blocked = !port.enable;
          }
        }
        const changed = this.updateEntry(client.mac, update);
        if (changed) {
          change = true;
          this.emit('update.client', { mac: client.mac });
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
        connected: null,
        blocked: info.blocked,
        limited: info.limited
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

  async setName(mac, name) {
    this.mac[mac].name = name;
    await DB.updateMac(this.toDB(mac));
  }

  async setIngress(mac, value) {
    const client = this.mac[mac];
    if (client && client.limited) {
      client.limited.ingress = value;
      if (client.connected) {
        if (client.ssid) {
          // WiFi
        }
        else if (typeof client.connected.portnr === 'number') {
          // Wired
          client.connected.device.writeKV(`network.physical.port.${client.connected.portnr}.limit.ingress`, value);
        }
      }
    }
  }

  async setEgress(mac, value) {
    const client = this.mac[mac];
    if (client && client.limited) {
      client.limited.egress = value;
      if (client.connected) {
        if (client.ssid) {
          // WiFi
        }
        else if (typeof client.connected.portnr === 'number') {
          // Wired
          client.connected.device.writeKV(`network.physical.port.${client.connected.portnr}.limit.egress`, value);
        }
      }
    }
  }

  async setBlocked(mac, isblocked) {
    const client = this.mac[mac];
    if (client) {
      client.blocked = isblocked;
      if (client.connected) {
        if (client.ssid) {
          // WiFi
        }
        else if (typeof client.connected.portnr === 'number') {
          // Wired
          client.connected.device.writeKV(`network.physical.port.${client.connected.portnr}.enable`, !isblocked);
        }
      }
    }
  }

  getClientsForDeviceAndPort(device, portnr) {
    const clients = [];
    for (let mac in this.mac) {
      const client = this.mac[mac];
      if (client.connected && client.connected.device === device && client.connected.portnr === portnr) {
        clients.push(client);
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

  getAllClients() {
    return this.mac;
  }

  getFilteredClients(filter) {
    const clients = {};
    for (let m in this.mac) {
      const client = this.mac[m];
      let include = true;
      if (filter.onlyBlocked && !client.blocked) {
        include = false;
      }
      if (filter.onlyLimited && !(client.limited && (client.limited.ingress || client.limited.egress))) {
        include = false;
      }
      if (include && (
        ('mac' in filter && client.mac.includes(filter.mac)) ||
        ('ip' in filter && client.ip && client.ip.includes(filter.ip)) ||
        ('hostname' in filter && client.hostname && client.hostname.toLowerCase().includes(filter.hostname)) ||
        ('name' in filter && client.name.toLowerCase().includes(filter.name)) ||
        ('wifi' in filter && filter.wifi && client.ssid) ||
        ('wired' in filter && filter.wired && !client.ssid) ||
        ('ssid' in filter && client.ssid.toLowerCase().includes(filter.ssid)) ||
        ('oui' in filter && client.oui && client.oui.toLowerCase().includes(filter.oui)) ||
        ('connection' in filter && client.connected && client.connected.device.name.toLowerCase().includes(filter.connection))
      )) {
        clients[m] = client;
      }
    }
    return clients;
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
