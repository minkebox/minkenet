const OID = require('../../../../../OID');

module.exports = {
  system: {
    ipv4$1: {
      $: 'oid',
      arg: '1.3.6.1.2.1.4.20.1',
      values: {
        $: 'fn',
        arg: ctx => {
          const base = ctx.context[1][3][6][1][2][1][4][20][1];
          const addrs = OID.getValues(base[1]);
          const masks = OID.getValues(base[3]);
          for (let i = 0; i < addrs.length; i++) {
            if (addrs[i] !== '127.0.0.1') {
              return {
                address: addrs[i],
                netmask: masks[i]
              };
            }
          }
          return {};
        }
      }
    },
    ipv4$2: {
      gateway: { $: 'oid', arg: '1.3.6.1.2.1.4.21.1.7.0.0.0.0' }
    },
    ipv4$3: {
      $: 'fetch',
      arg: '/data/lan.json',
      type: 'jsonp',
      values: {
        mode: {
          $: null,
          arg: 'data.connType',
          map: {
            dynamic: 'dhcp',
            static: 'static'
          }
        }
      }
    }
  }
}
