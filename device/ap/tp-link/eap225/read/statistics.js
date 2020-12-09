const BASE = '1.3.6.1.2.1.2.2';

module.exports = {
  $: 'oid',
  arg: BASE,
  values: {
    network: {
      physical: {
        port: {
          '0': {
            statistics: {
              rx: {
                bytes: `${BASE}.1.10.2`,
                unicast: `${BASE}.1.11.2`,
                multicast: `${BASE}.1.12.2`,
                discarded: `${BASE}.1.13.2`,
                errors: `${BASE}.1.14.2`,
                unknown: `${BASE}.1.15.2`
              },
              tx: {
                bytes: `${BASE}.1.16.2`,
                unicast: `${BASE}.1.17.2`,
                multicast: `${BASE}.1.18.2`,
                discarded: `${BASE}.1.19.2`,
                errors: `${BASE}.1.20.2`
              }
            }
          }
        }
      }
    }
  }
};
