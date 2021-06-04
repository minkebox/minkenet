const EventEmitter = require('events');
const OS = require('os');
const DeviceManager = require('../DeviceManager');
const Log = require('debug')('discovery');

const NET = require('./net');
const MDNS = require('./mdns');
const ESCP = require('./escp');
const NSDP = require('./nsdp');
const MNDP = require('./mndp');
const ARP = require('./arp');
const DDP = require('./ddp');
const Omada = require('./omada');

class Discovery extends EventEmitter {

  constructor() {
    super();
    this.agents = {};
    this.addresses = {};
    this.addressRoot = this._getAddressRoot();

    ARP.singleton.root = this.addressRoot;

    this._doUpdate = this._doUpdate.bind(this);
  }

  start() {
    this.build();
    for (let key in this.agents) {
      this.agents[key].on('update', this._doUpdate);
      this.agents[key].start();
    }
  }

  build() {
    this.agents = {};
    const devices = DeviceManager.getDevices();
    for (let i = 0; i < devices.length; i++) {
      const identify = devices[i].description.identify;
      let found = false;
      for (let ident in identify) {
        switch (ident) {
          case 'mdns':
            this.agents.mdns = MDNS.getInstance();
            found = true;
            break;
          case 'escp':
            this.agents.escp = ESCP.getInstance();
            found = true;
            break;
          case 'nsdp':
            this.agents.nsdp = NSDP.getInstance();
            found = true;
            break;
          case 'mndp':
            this.agents.mndp = MNDP.getInstance();
            found = true;
            break;
          case 'arp':
            this.agents.arp = ARP.getInstance();
            found = true;
            break;
          case 'ddp':
            this.agents.ddp = DDP.getInstance();
            found = true;
            break;
          case 'omada':
            this.agents.omada = Omada.getInstance();
            found = true;
            break;
          case 'http':
            if (!identify.http.ipv4) {
              break;
            }
            const addrOptions = Array.isArray(identify.http.ipv4) ? identify.http.ipv4 : [ identify.http.ipv4 ];
            addrOptions.forEach(ipv4 => {
              if (ipv4 === 'dhcp') {
                if (!this.agents.dhcp) {
                  // Scan the network.
                  this.agents.dhcp = NET.getInstance(this.addressRoot);
                  this.agents.dhcp.first = 1;
                  this.agents.dhcp.count = 255;
                }
              }
              else {
                const address = ipv4.split('.');
                const base = address.slice(0, -1).join('.');
                let agent = this.agents[base];
                if (!agent) {
                  agent = NET.getInstance(base);
                  this.agents[base] = agent;
                }
                if (agent.range.indexOf(address[3]) === -1) {
                  agent.range.push(address[3]);
                }
              }
            });
            break;
          default:
            break;
        }
      }
    }
    Log('build:', Object.keys(this.agents));
  }

  stop() {
    for (let key in this.agents) {
      this.agents[key].off('update', this._doUpdate);
      this.agents[key].stop();
    }
  }

  clear() {
    this.addresses = {};
    for (let key in this.agents) {
      this.agents[key].clear();
    }
  }

  remove(ip) {
    this.clear();
  }

  _doUpdate() {
    let change = false;
    for (let key in this.agents) {
      this.agents[key].getAddresses().forEach(address => {
        const id = `${key}:${address.ip}`;
        if (!this.addresses[id]) {
          this.addresses[id] = address;
          change = true;
        }
      });
    }
    if (change) {
      this.emit('update');
    }
  }

  _getAddressRoot() {
    const ifaces = OS.networkInterfaces();
    for (let iface in ifaces) {
      if (iface !== 'lo' && iface !== 'dns0') {
        for (let i = 0; i < ifaces[iface].length; i++) {
          const address = ifaces[iface][i];
          if (!address.internal && address.family === 'IPv4') {
            return address.address.split('.').slice(0, -1).join('.');
          }
        }
      }
    }
    return null;
  }

  getAddresses() {
    return Object.values(this.addresses).map(o => Object.assign({}, o)); // Shallow copy
  }
}

module.exports = new Discovery();
