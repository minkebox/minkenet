module.exports = {
  system: {
    $: '1.3.6.1.2.1.1',
    description: '1.3.6.1.2.1.1.1.0',
    uptime: '1.3.6.1.2.1.1.3.0',
    contact: '1.3.6.1.2.1.1.4.0',
    name: '1.3.6.1.2.1.1.5.0',
    location: '1.3.6.1.2.1.1.6.0'
  },
  network: {
    physical: {
      $: '1.3.6.1.2.1.2.2',
      id: '1.3.6.1.2.1.2.2.1.1.1',
      status: '1.3.6.1.2.1.2.2.1.8',
      framesize: '1.3.6.1.2.1.2.2.1.4',
      speed: '1.3.6.1.2.1.2.2.1.5',
      enable: '1.3.6.1.2.1.2.2.1.7',
      statistics: {
        rx: {
          bytes: '1.3.6.1.2.1.2.2.1.10',
          unicast: '1.3.6.1.2.1.2.2.1.11',
          multicast: '1.3.6.1.2.1.2.2.1.12',
          discarded: '1.3.6.1.2.1.2.2.1.13',
          errors: '1.3.6.1.2.1.2.2.1.14',
          unknownprotos: '1.3.6.1.2.1.2.2.1.15'
        },
        tx: {
          bytes: '1.3.6.1.2.1.2.2.1.16',
          unicast: '1.3.6.1.2.1.2.2.1.17',
          multicast: '1.3.6.1.2.1.2.2.1.18',
          discarded: '1.3.6.1.2.1.2.2.1.19',
          errors: '1.3.6.1.2.1.2.2.1.20'
        }
      }
    },
    wireless: {
      station: {
        ssid: '1.2.840.10036.1.1.1.9',
        channel: '1.2.840.10036.4.5.1.1'
      }
    }
  },

  getValues: function(v, fn) {
    if (!fn) {
      fn = v => v;
    }
    const l = [];
    function _f(v) {
      if (typeof v === 'object') {
        for (let k in v) {
          _f(v[k]);
        }
      }
      else {
        l.push(fn(v));
      }
    }
    _f(v);
    return l;
  },

  getKeyValues: function(k, v, fn) {
    if (!fn) {
      fn = (_, v) => v;
    }
    const l = {};
    function _f(k, v) {
      if (typeof v === 'object') {
        for (let c in v) {
          _f(k ? `${k}.${c}` : c, v[c]);
        }
      }
      else {
        l[k] = fn(k, v);
      }
    }
    _f(k, v);
    return l;
  },

  toIPAddress: function(v) {
    return new Uint8Array(Buffer.from(v, 'latin1')).join('.');
  },

  toMacAddress: function(v) {
    return Buffer.from(v, 'latin1').toString('hex').replace(/(..)(?!$)/g,'$1:');
  }
};
