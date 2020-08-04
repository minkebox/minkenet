const EventEmitter = require('events');
const OS = require('os');
const ChildProcess = require('child_process');
const HTTP = require('http');
const Log = require('debug')('discovery');


const SCAN_INTERVAL = 60; // s
const DEFAULT_PROBE_TIMEOUT = 1000; // ms
const PARALLEL = 16;
const DEFAULT_OCTET = 253;

class Net extends EventEmitter {

  constructor(base) {
    super();
    this.base = base;
    this.port = 80;
    this.found = {};
    this.range = [];
    this.first = 1;
    this.count = 0;
    this.lastoctet = DEFAULT_OCTET;
    this.probeTimeout = DEFAULT_PROBE_TIMEOUT;
    this.active = 'stopped';
  }

  start() {
    const old = this.active;
    this.active = 'running';
    if (old === 'stopped') {
      (async () => {
        if (!this._addAddress()) {
          Log('Failed to setup address range for scan', this.base);
          this.active = 'stopped';
          return;
        }
        while (this.active === 'running') {
          await this.scan();
          await new Promise(resolve => {
            this.timer = setTimeout(resolve, SCAN_INTERVAL * 1000);
          });
          this.timer = null;
        }
        this._removeAddress();
        this.active = 'stopped';
      })();
    }
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      this._removeAddress();
      this.active = 'stopped';
    }
    else if (this.active != 'stopped') {
      this.active = 'stopping';
    }
  }

  clear() {
    this.found = {};
  }

  async scan() {
    const addresses = [];
    if (this.count) {
      for (let i = this.first; i < this.first + this.count; i++) {
        addresses.push({ type: 'net', ip: `${this.base}.${i}`, port: this.port });
      }
    }
    this.range.forEach(i => {
      const ip = `${this.base}.${i}`;
      if (!addresses.find(a => a.ip === ip)) {
        addresses.push({ type: 'net', ip: ip, port: this.port });
      }
    });

    const pending = {};
    let i = 0;
    while (this.active === 'running') {
      while (i < addresses.length && Object.keys(pending).length < PARALLEL) {
        const addr = addresses[i];
        i++;
        if (!this.found[addr.ip]) {
          pending[addr.ip] = this.detect(addr);
        }
      }
      const running = Object.values(pending);
      if (!running.length) {
        break;
      }
      const result = await Promise.race(running);
      delete pending[result.addr.ip];
      if (result.valid && !this.found[result.addr.ip]) {
        Log('found:', result.addr);
        this.found[result.addr.ip] = { type: 'net', ip: result.addr.ip, port: result.addr.port || 80, txt: {} };
        this.emit('update');
      }
    }
  }

  detect(addr) {
    const url = `http://${addr.ip}:${addr.port || 80}`;
    //Log('detect:', url);
    return new Promise(resolve => {
      let req = HTTP.get(url, res => {
        if (req) {
          req = null;
          //Log('statusCode:', res.statusCode);
          switch (res.statusCode) {
            case 200:
            case 401: // Unauthorized
            case 303: // Redirect
              resolve({ valid: true, addr: addr });
              break;
            default:
              resolve({ valid: false, addr: addr });
              break;
          }
        }
      });
      const abort = () => {
        if (req) {
          req.abort();
          req = null;
          //Log('scan fail:', addr.ip);
          resolve({ false: true, addr: addr });
        }
      }
      setTimeout(abort, this.probeTimeout);
      req.once('error', abort);
    });
  }

  _addAddress() {
    this.ifaceDev = null;
    const ifaces = OS.networkInterfaces();
    for (let iface in ifaces) {
      for (let i = 0; i < ifaces[iface].length; i++) {
        const address = ifaces[iface][i];
        if (!address.internal && address.family === 'IPv4') {
          if (!this.ifaceDev) {
            this.ifaceDev = iface;
          }
          const cidr = address.cidr.split('/');
          if (cidr[0].indexOf(`${this.base}.`) === 0) {
            // We have an address on this network already
            return true;
          }
        }
      }
    }
    if (!this.ifaceDev) {
      return false;
    }
    this.ifaceAddr = `${this.base}.${this.lastoctet}/24`;
    Log(`ip addr add ${this.ifaceAddr} dev ${this.ifaceDev}`);
    const result = ChildProcess.spawnSync('/sbin/ip', [ 'addr', 'add', this.ifaceAddr, 'dev', this.ifaceDev ]);
    if (result.status !== 0) {
      Log('spawn:', result.status, result.error);
      this.ifaceAddr = null; // Don't try to remove it on shutdown
      return false;
    }
    return true;
  }

  _removeAddress() {
    if (this.ifaceAddr) {
      Log(`ip addr del ${this.ifaceAddr} dev ${this.ifaceDev}`);
      const result = ChildProcess.spawnSync('/sbin/ip', [ 'addr', 'del', this.ifaceAddr, 'dev', this.ifaceDev ]);
      if (result.status !== 0) {
        Log('spawn:', result.status, result.error);
      }
    }
  }

  getAddresses() {
    return Object.values(this.found);
  }
}

module.exports = {

  networks: {},

  getInstance: function(base) {
    if (!base) {
      throw new Error('missing base');
    }
    let net = this.networks[base];
    if (!net) {
      net = new Net(base);
      this.networks[base] = net;
    }
    return net;
  }

}
