const OID = require('../../../../../OID');

module.exports = {
  system: {
    name: { $: 'oid', arg: OID.system.name },
    location: { $: 'oid', arg: OID.system.location },
    contact: { $: 'oid', arg: OID.system.contact },
    macAddress: {
      0: {
        $: 'oid',
        arg: '1.3.6.1.2.1.2.2.1.6.2',
        map: OID.toMacAddress
      }
    },
    ipv4: {
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
    }
  }
};
