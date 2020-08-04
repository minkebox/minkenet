const DnsPacket = require('dns-packet');
const Dgram = require('dgram');
const EventEmitter = require('events');
const Log = require('debug')('discovery');

const MCAST_ADDRESS = '224.0.0.251';
const PORT = 5353;
const DEFAULT_TTL = 120; // 2 minutes
const PING_INTERVAL = 60; // 1 minute

class MDNS extends EventEmitter {

  constructor() {
    super();
    this._HTTP = [];
  }

  async start() {
    await this._create();
    const ping = () => this._query([{ name: '_http._tcp.local', type: 'PTR' }]);
    this._ping = setInterval(ping, PING_INTERVAL * 1000);
    ping();
  }

  stop() {
    if (this._ping) {
      clearInterval(this._ping);
      this._ping = null;
    }
    if (this._socket) {
      this._socket.close();
      this._socket = null;
    }
  }

  clear() {
    this._HTTP = [];
  }

  async _create() {
    return new Promise(resolve => {
      this._socket = Dgram.createSocket({
        type: 'udp4',
        reuseAddr: true
      }, msg => this._incoming(msg));
      this._socket.bind(PORT, MCAST_ADDRESS, () => {
        this._socket.setMulticastTTL(255);
        this._socket.setMulticastLoopback(false);
        this._socket.addMembership(MCAST_ADDRESS, '0.0.0.0');
        this._socket.setMulticastInterface('0.0.0.0');
        resolve();
      });
    });
  }

  _incoming(msg) {
    const pkt = DnsPacket.decode(msg);
    //Log('incoming:', JSON.stringify(pkt, null, 2));
    if (pkt.type === 'response') {
      const now = Math.floor(Date.now() / 1000);
      let update = false;
      pkt.answers.forEach(answer => {
        switch (answer.type) {
          case 'A':
          {
            for (let key in this._HTTP) {
              if (this._HTTP[key].target == answer.name.toLowerCase() && this._HTTP[key].ip != answer.data) {
                this._HTTP[key].ip = answer.data;
                update = true;
                //Log('A', answer.data);
                break;
              }
            }
            break;
          }
          case 'PTR':
          {
            switch (answer.name) {
              case '_http._tcp.local':
                const old = this._HTTP[answer.data];
                if (!old) {
                  this._HTTP[answer.data] = { name: answer.data, expires: (answer.ttl || DEFAULT_TTL) + now, txt: [] };
                  Log('_http:', answer.data);
                }
                else {
                  old.expires = (answer.ttl || DEFAULT_TTL) + now;
                }
                this._query([
                  { name: answer.data, type: 'TXT' },
                  { name: answer.data, type: 'SRV' }
                ]);
                break;
              default:
                break;
            }
          }
          case 'TXT':
          {
            const rec = this._HTTP[answer.name];
            if (rec) {
              if (Array.isArray(answer.data)) {
                rec.txt = {};
                answer.data.forEach(data => {
                  const kv = data.toString('utf8').split('=');
                  rec.txt[kv[0]] = kv[1];
                });
              }
              else {
                const kv = answer.data.toString('utf8').split('=');
                rec.txt = { [kv[0]]: kv[1] };
              }
              //Log('txt:', answer.name, rec.txt);
            }
            break;
          }
          case 'SRV':
          {
            const rec = this._HTTP[answer.name];
            if (rec) {
              rec.port = answer.data.port;
              rec.target = answer.data.target.toLowerCase();
              this._query([
                { name: rec.target, type: 'A' }
              ]);
              //Log('srv:', answer.data);
            }
            break;
          }
          default:
            break;
        }
      });
      if (update) {
        this.emit('update');
      }
    }
  }

  async _query(queries) {
    if (queries.length && this._socket) {
      return new Promise(resolve => {
        const msg = DnsPacket.encode({
          type: 'query',
          answers: [],
          authorities: [],
          additionals: [],
          questions: queries.map(query => Object.assign({ class: 'IN', flush: false, ttl: 120 }, query))
        });
        this._socket.send(msg, 0, msg.length, PORT, MCAST_ADDRESS, () => {
          resolve(true);
        });
      });
    }
    else {
      return false;
    }
  }

  getAddresses() {
    const addresses = [];
    for (let key in this._HTTP) {
      if (this._HTTP[key].ip) {
        addresses.push({ type: 'mdns', ip: this._HTTP[key].ip, port: this._HTTP[key].port, txt: this._HTTP[key].txt });
      }
    }
    return addresses;
  }

}

module.exports = {

  singleton: new MDNS(),

  getInstance: function() {
    return this.singleton;
  }

}
