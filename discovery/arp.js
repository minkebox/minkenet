const EventEmitter = require('events');
const ChildProcess = require('child_process');
const Apps = require('../utils/HelperApps');

const DEFAULT_SEARCH_INTERVAL = 10 * 60 * 1000; // 10 minutes

class Arp extends EventEmitter {

  constructor() {
    super();
    this.root = '127.0.0';
    this.discovery = null;
    this.found = {};
  }

  start() {
    const run = async () => {
      if (await this._discover()) {
        this.emit('update');
      }
    }
    this.discovery = setInterval(run, DEFAULT_SEARCH_INTERVAL);
    run();
  }

  stop() {
    if (this.discovery) {
      clearInterval(this.discovery);
      this.discovery = null;
    }
  }

  clear() {
    this.found = {};
  }

  getAddresses() {
    return Object.values(this.found);
  }

  async _discover() {
    const list = [];
    for (let i = 1; i < 255; i++) {
      list.push(new Promise(resolve => {
        ChildProcess.exec(`${Apps.ping} -c 1 -W 1 ${this.root}.${i}`, resolve);
      }));
    }
    await Promise.all(list);
    const output = await new Promise(resolve => {
      ChildProcess.exec(`${Apps.arp} -a`, (err, sout, serr) => {
        resolve(sout);
      });
    });
    let update = false;
    output.split('\n').forEach(line => {
      const p = line.split(' ');
      if (p.length >= 4) {
        const mac = p[3];
        if (mac !== '<incomplete>') {
          const ip = p[1].replace(/^\((.*)\)$/,"$1");
          if (!this.found[ip] || this.found[ip].txt.macAddress != mac) {
            this.found[ip] = { type: 'arp', ip: ip, txt: { macAddress: mac } };
            if (p[0] !== '?') {
              this.found[ip].txt.hostname = p[0];
            }
            update = true;
          }
        }
      }
    });
    return update;
  }
}

module.exports = {

  singleton: new Arp(),

  getInstance: function() {
    return this.singleton;
  }

}
