const EventEmitter = require('events');
const DB = require('./Database');
const JSONPath = require('jsonpath-plus').JSONPath;
const Log = require('debug')('config');

const DEFAULT_CONFIG = {
  system: {
    ipv4: {
      allocate: false,
      pool: {
        start: '192.168.0.10',
        end: '192.168.0.20'
      },
      netmask: '255.255.255.0',
      gateway: '192.168.0.1',
      dns: '1.1.1.1'
    },
    keychain: {
      defaultpw: false,
      password: 'admin'
    }
  },
  network: {
    physical: {
      flowcontrol: false,
      jumbo: true
    },
    igmp: {
      snoop: null,
    },
    vlan: {
      '8021q': true,
      ivl: true,
      autoroute: true,
      management: false,
      managementid: '1'
    }
  },
  monitor: {
    clients: false
  }
};


class Config extends EventEmitter {

  constructor() {
    super();
    this.config = DEFAULT_CONFIG;
  }

  read(key) {
    const value = JSONPath({ path: key, json: this.config });
    if (!value || !value[0]) {
      return null;
    }
    return value[0];
  }

  readAll() {
    function walk(obj) {
      if (Object(obj) !== obj) {
        return obj;
      }
      const nobj = {};
      for (let key in obj) {
        nobj[key] = walk(obj[key]);
      }
      return nobj;
    }
    return walk(this.config);
  }

  write(key, value) {
    Log('write:', key, value);
    const ptr = JSONPath({ path: key, json: this.config, resultType: 'all' });
    if (!ptr || !ptr[0]) {
      return null;
    }
    if (!ptr[0].parent || !ptr[0].parentProperty) {
      return null;
    }
    if (ptr[0].value !== value) {
      ptr[0].parent[ptr[0].parentProperty] = value;
      DB.updateConfig(this.toDB());
      this.emit('update', { key: key });
    }
  }

  fromDB(data) {
    if (data) {
      function merge(to, from) {
        if (typeof to === 'object' && to !== null) {
          for (let key in to) {
            if (key in from) {
              to[key] = merge(to[key], from[key]);
            }
          }
          return to;
        }
        return from;
      }
      this.config = merge(DEFAULT_CONFIG, JSON.parse(data.config));
    }
    //console.log(JSON.stringify(this.config, null, 1));
  }

  toDB() {
    return {
      _id: 'config',
      config: JSON.stringify(this.config)
    };
  }

  async start() {
    this.fromDB(await DB.getConfig());
  }

  stop() {
  }

}

module.exports = new Config();
