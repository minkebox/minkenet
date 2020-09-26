const EventEmitter = require('events');
const JSONPath = require('jsonpath-plus').JSONPath;
const Log = require('debug')('state');
const LogWrite = Log.extend('write');
const LogError = Log.extend('error');

const NEW_VALUE = { _: 'NEW_VALUE'};
const DELETED_VALUE = { _: 'DELETED_VALUE '};

class DeviceStateInstance extends EventEmitter {

  constructor() {
    super();
    this.state = {};
  }

  init(newState) {
    this.state = JSON.parse(JSON.stringify(newState)); // *must* copy the new state
  }

  readKV(key, options) {
    options = Object.assign({ deleted: false, new: true, stable: true, original: false, info: false, value: true, depth: Number.MAX_SAFE_INTEGER }, options);
    Log('read:', key, JSON.stringify(options));
    const kv = JSONPath({ path: key, json: this.state });
    const kv0 = kv && kv[0];
    if (!kv0) {
      return null;
    }

    function essential(obj, depth) {
      if (depth < 0) {
        return null;
      }

      if (!options.deleted && obj.$o === DELETED_VALUE) {
        return null;
      }
      if (!options.new && obj.$o === NEW_VALUE) {
        return null;
      }

      if (('$' in obj) || depth === 0) {
        if (!options.stable && (obj.$o !== NEW_VALUE && obj.$o !== DELETED_VALUE)) {
          return null;
        }
      }

      if ('$' in obj) {
        if (options.original) {
          if (obj.$o === NEW_VALUE) {
            return null;
          }
          if (obj.$o !== DELETED_VALUE) {
            return obj.$o;
          }
        }
        return obj.$;
      }

      const nobj = {};
      for (let key in obj) {
        if (key[0] !== '$') {
          const val = essential(obj[key], depth - 1);
          if (val !== null) {
            nobj[key] = val;
          }
        }
      }
      return nobj;
    }

    if (!options.info) {
      const r = essential(kv0, options.depth);
      Log('readkv r:', r);
      return r;
    }

    function walk(obj) {
      if ('$o' in obj) {
        return true;
      }
      else if ('$' in obj) {
        return false;
      }
      for (let k in obj) {
        if (k[0] !== '$') {
          if (walk(obj[k])) {
            return true;
          }
        }
      }
      return false;
    }

    const info = {
      ro: kv0.$ro || false,
      modified: walk(kv0)
    };
    if (options.value) {
      info.value = essential(kv0, options.depth);
    }
    Log('readkv info:', info);
    return info;
  }

  writeKV(key, value, options) {
    options = Object.assign({ create: false, track: true, replace: false }, options);
    Log('write:', key, value, options);
    const kv = JSONPath({ path: key, json: this.state, resultType: 'all' });
    if (!kv) {
      LogError(`writekv: bad key ${key}`);
      return null;
    }
    // If we didnt find a key then we can't write to it, unless we're creating
    const kv0 = kv[0] && kv[0].value;
    if (!kv0 && !options.create) {
      LogError(`Writing to missing key ${key}`);
      return null;
    }
    const primitive = (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean');

    if (kv0) {
      // Read only
      if (kv0.$ro) {
        return null;
      }
      // Writing to a leaf key
      if ('$' in kv0) {
        // A leaf must be a primitive type
        if (!primitive) {
          LogError(`writekv: non primitive ${key}`);
          return null;
        }
        // Deleted key (but can restore if we're creating)
        if (kv0.$o === DELETED_VALUE) {
          if (!options.create) {
            LogError(`writekv: write to deleted ${key}`);
            return null;
          }
          // Cannot restore a key in a deleted parent
          if (kv[0].parent.$o === DELETED_VALUE) {
            LogError(`writekv: write to deleted parent ${key}`);
            return null;
          }
          // Restore
          delete kv0.$o;
          this.emit('update', { op: 'restore', key: key });
        }
        // Same value
        if (kv0.$ === value) {
          return 'unmodified';
        }
        // Save original value
        if (!('$o' in kv0)) {
          kv0.$o = kv0.$;
        }
        kv0.$ = value;
        // Restored original value (or remove tracking)
        if (kv0.$o === kv0.$ || options.track === false) {
          delete kv0.$o;
        }
        this.emit('update', { op: 'write', key: key, value: value });
        LogWrite('modified:', key, value, 'old', kv0.$o);
        return 'modified';
      }
      // Writing to a non-leaf cannot be primitive (we'll always create an object anyway).
      if (primitive) {
        LogError(`writekv: primitive non-leaf key ${key}`);
        return null;
      }
      if (kv0.$o === DELETED_VALUE) {
        if (!options.create) {
          // Can't restore an old key unless we're creating
          LogError(`writekv: deleted key ${key}`);
          return null;
        }
        if (options.replace) {
          LogError(`writekv: cannot replace a deleted tree ${key}`);
          return null;
        }
        // Cannot restore a key in a deleted parent
        if (kv[0].parent.$o === DELETED_VALUE) {
          LogError(`writekv: bad parent ${key}`);
          return null;
        }
        // Restore
        delete kv0.$o;
        this.emit('update', { op: 'restore', key: key });
        return 'restore';
      }

      if (!options.replace) {
        // Writing to an existing key does nothing unless we're replacing it.
        return 'unmodified';
      }

      // Replacing a tree with a new tree
      // There might be an optimal way to do this, but for now we just delete the current tree,
      // recreate it, and then fill it with these new values
      this.deleteKV(key);
      this.writeKV(key, {}, { create: true });
      const noptions = { create: true, track: options.track };
      const walk = (basek, basev) => {
        for (let childk in basev) {
          const childv = basev[childk];
          const childp = (typeof childv === 'number' || typeof childv === 'string' || typeof childv === 'boolean');
          if (childp) {
            this.writeKV(`${basek}.${childk}`, childv, noptions);
          }
          else {
            this.writeKV(`${basek}.${childk}`, {}, noptions);
            walk(`${basek}.${childk}`, childv);
          }
        }
      }
      walk(key, value);
      this.emit('update', { op: 'replace', key: key });
      return 'replace';
    }

    if (!options.create) {
      LogError(`writekv: missing key ${key}`);
      return null;
    }

    if (options.replace) {
      LogError(`writekv: cannot replace a non-existant tree ${key}`);
      return null;
    }

    // Creating a new key.
    const s = key.split('.');
    const pkv = JSONPath({ path: s.slice(0, -1).join('.'), json: this.state });
    const pkv0 = pkv && pkv[0];
    if (!pkv0) {
      LogError(`writekv: bad parent key ${key}`);
      return null;
    }
    // Cannot create a key in a deleted parent
    if (pkv0.$o === DELETED_VALUE) {
      LogError(`writekv: deleted parent key ${key}`);
      return null;
    }
    const nkey = s.slice(-1)[0];
    if (primitive) {
      pkv0[nkey] = { $: value, $o: NEW_VALUE };
    }
    else {
      pkv0[nkey] = { $o: NEW_VALUE };
    }
    if (options.track === false) {
      delete pkv0[nkey].$o;
    }

    this.emit('update', { op: 'create', key: key });
    LogWrite('created:', key, value);
    return 'created';
  }

  deleteKV(key) {
    Log('delete:', key);
    const kv = JSONPath({ path: key, json: this.state, resultType: 'all' });
    const kv0 = kv && kv[0] && kv[0].value;
    if (!kv0) {
      // Deleting key which doesn't exist is fine
      return 'nokey';
    }

    function del(obj) {
      if (obj.$o !== DELETED_VALUE) {
        if ('$' in obj) {
          // Restore original value before we mark this as deleted
          if ('$o' in obj) {
            obj.$ = obj.$o;
          }
        }
        else {
          for (let key in obj) {
            if (key[0] !== '$') {
              // If key is a NEW_VALUE, we can delete it and its children for real
              // rather than just marking it as deleted.
              if (obj[key].$o === NEW_VALUE) {
                delete obj[key];
              }
              else {
                del(obj[key]);
              }
            }
          }
        }
        obj.$o = DELETED_VALUE;
      }
    }
    if (kv0.$o === NEW_VALUE) {
      // If kv0.$o is a NEW_VALUE, we delete it for real.
      delete kv[0].parent[kv[0].parentProperty];
    }
    else {
      del(kv0);
    }
    this.emit('update', { op: 'delete', key: key });
    LogWrite('deleted:', key);
    return 'deleted';
  }

  commitKV() {
    Log('commit:');
    function walk(ctx) {
      if (!('$' in ctx)) {
        for (let k in ctx) {
          if (k[0] !== '$') {
            if (ctx[k].$o === DELETED_VALUE) {
              delete ctx[k];
            }
            else {
              walk(ctx[k]);
            }
          }
        }
      }
      delete ctx.$o;
    }
    walk(this.state);
    Log('new:', JSON.stringify(this.state));
    this.emit('update', { op: 'commit' });
  }

  revertKV() {
    Log('revert:');
    function walk(ctx) {
      if ('$' in ctx) {
        if ('$o' in ctx && ctx.$o !== DELETED_VALUE) {
          ctx.$ = ctx.$o;
        }
      }
      else {
        for (let k in ctx) {
          if (k[0] !== '$') {
            if (ctx[k].$o === NEW_VALUE) {
              delete ctx[k];
            }
            else {
              walk(ctx[k])
            }
          }
        }
      }
      delete ctx.$o;
    }
    walk(this.state);
    Log('reverted:', JSON.stringify(this.state));
    this.emit('update', { op: 'revert' });
  }

  localKV(key, local) {
    Log('localize:', key, local);
    const kv = JSONPath({ path: key, json: this.state });
    const kv0 = kv && kv[0];
    if (!kv0 || !('$' in kv0)) {
      return null;
    }
    if (local) {
      kv0.$l = true;
      return 'local';
    }
    else {
      delete kv0.$l;
      return 'remote';
    }
  }

  needCommit() {
    function walk(ctx) {
      if ('$o' in ctx) {
        return true;
      }
      else {
        for (let k in ctx) {
          if (k[0] !== '$') {
            if (walk(ctx[k])) {
              return true;
            }
          }
        }
      }
      return false;
    }
    return walk(this.state);
  }

  mergeIntoState(src, trim) {
    Log('mergeintostate:', JSON.stringify(src, null, 2));
    this._mergeDeviceState(this, { state: src }, 'state', '', trim);
  }

  _mergeDeviceState(target, src, key, parent, trim) {
    const val = src[key];
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      if (!target[key]) {
        target[key] = { $: val };
      }
      else {
        if (target[key].$l) {
          // Local state is maintained locally and cannot be overwritten by merging
          // remove data.
        }
        // Can only merge state over value which hasn't been locally modified
        else if ('$o' in target[key]) {
          if (val === target[key].$) {
            delete target[key].$o;
          }
          else {
            target[key].$o = val;
          }
        }
        else if (target[key].$ !== val) {
          target[key].$ = val;
          this.emit('update', { op: 'merge', key: `${parent.substring(7)}.${key}`, value: val });
        }
      }
    }
    else {
      const okeys = {};
      if (!target[key]) {
        target[key] = {};
      }
      if (trim) {
        if ('$' in target[key] && target[key].$o !== NEW_VALUE) {
          okeys.$ = true;
        }
        for (let k in target[key]) {
          if (k[0] !== '$' && target[key][k].$o !== NEW_VALUE) {
            okeys[k] = true;
          }
        }
      }
      for (let k in src[key]) {
        if (key[0] !== '$') {
          this._mergeDeviceState(target[key], val, k, `${parent}.${key}`, trim);
          delete okeys[k];
        }
      }
      for (let k in okeys) {
        delete target[key][k];
      }
    }
  }

  toDB() {
    function walk(ctx) {
      if ('$' in ctx) {
        const v = { $: ctx.$ };
        if ('$ro' in ctx) {
          v.$ro = ctx.$ro;
        }
        if ('$l' in ctx) {
          v.$l = ctx.$l;
        }
        return v;
      }
      else {
        const o = {};
        for (let k in ctx) {
          if (k[0] !== '$') {
            o[k] = walk(ctx[k]);
          }
        }
        return o;
      }
    }
    return {
      state: JSON.stringify(walk(this.state))
    };
  }
}

class DeviceState {

  constructor() {
    // Well-known keys
    this.KEY_SYSTEM_NAME = 'system.name';
    this.KEY_SYSTEM_MACADDRESS = 'system.macAddress';
    this.KEY_SYSTEM_IPV4 = 'system.ipv4';
    this.KEY_SYSTEM_IPV4_MODE = 'system.ipv4.mode';
    this.KEY_SYSTEM_IPV4_ADDRESS = 'system.ipv4.address';
    this.KEY_SYSTEM_IPV4_PORT = 'system.ipv4.port';
    this.KEY_SYSTEM_IPV4_NETMASK = 'system.ipv4.netmask';
    this.KEY_SYSTEM_IPV4_GATEWAY = 'system.ipv4.gateway';
    this.KEY_SYSTEM_IPV4_DNS = 'system.ipv4.dns';
    this.KEY_SYSTEM_KEYCHAIN = 'system.keychain';
    this.KEY_SYSTEM_KEYCHAIN_USERNAME = 'system.keychain.username';
    this.KEY_SYSTEM_KEYCHAIN_PASSWORD = 'system.keychain.password';
    this.KEY_SYSTEM_SNMP = 'system.snmp';
    this.KEY_SYSTEM_SNMP_ENABLE = 'system.snmp.enable';
    this.KEY_SYSTEM_SNMP_VERSION = 'system.snmp.version';
    this.KEY_NETWORK_IGMP_SNOOP = 'network.igmp.snoop';
    this.KEY_NETWORK_VLANS_IVL = 'network.vlans.ivl';
    this.KEY_NETWORK_VLANS_8021Q = 'network.vlans.8021q';
    this.KEY_NETWORK_PHYSICAL_PORT = 'network.physical.port';
  }

  newInstance() {
    return new DeviceStateInstance();
  }

  fromDB(data) {
    const state = new DeviceStateInstance();
    if (data) {
      state.state = JSON.parse(data.state);
    }
    return state;
  }

}

module.exports = new DeviceState();
