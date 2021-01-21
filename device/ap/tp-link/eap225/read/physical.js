const BASE = '1.3.6.1.2.1.2.2';

module.exports = {
  $: 'oid',
  arg: BASE,
  values: {
    network: {
      physical: {
        port: {
          0: {
            id: { $: null, arg: `${BASE}.1.2.2` },
            status: { $: null, arg: `${BASE}.1.8.2`, map: { 1: 'up', 2: 'down' } },
            framesize: { $: null, arg: `${BASE}.1.4.2` },
            type: { $: null, arg: `${BASE}.1.5.2`, map: { 0: '-', 10000000: '100M', 1000000000: '1G', } }
          }
        }
      }
    },
    system: {
      macAddress: {
        0: { $: null, arg: `${BASE}.1.6.2`, map: OID.toMacAddress }
      }
    }
  }
};
