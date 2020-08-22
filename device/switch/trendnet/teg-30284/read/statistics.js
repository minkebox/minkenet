const BASE = '1.3.6.1.4.1.28866.3.1.23.1.1';

module.exports = {
  network: {
    physical: {
      port: {
        $: 'oid',
        arg: BASE,
        values: {
          $: 'iterate',
          arg: itr => [{
            statistics: {
              rx: {
                bytes: `${BASE}.2.${itr.index + 1}`,
                unicast: `${BASE}.3.${itr.index + 1}`,
                multicast: `${BASE}.4.${itr.index + 1}`,
                discarded: `${BASE}.5.${itr.index + 1}`,
                errors: `${BASE}.6.${itr.index + 1}`,
                undersized: `${BASE}.14.${itr.index + 1}`,
                oversized: `${BASE}.15.${itr.index + 1}`,
                crc: `${BASE}.13.${itr.index + 1}`,
                collisions: `${BASE}.17.${itr.index + 1}`,
                drop: `${BASE}.12.${itr.index + 1}`,
                fragments: `${BASE}.16.${itr.index + 1}`
              },
              tx: {
                bytes: `${BASE}.7.${itr.index + 1}`,
                unicast: `${BASE}.8.${itr.index + 1}`,
                multicast: `${BASE}.9.${itr.index + 1}`,
                discarded: `${BASE}.10.${itr.index + 1}`,
                errors: `${BASE}.11.${itr.index + 1}`,
              }
            }
          }]
        }
      }
    }
  }
};
