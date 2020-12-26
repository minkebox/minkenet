const BASE = '1.3.6.1.4.1.28866.3.1.3.1.1';

module.exports = {
  network: {
    physical: {
      port: {
        $: 'oid',
        arg: BASE,
        values: {
          $: 'iterate',
          arg: itr => [{
            limit: {
              egress: {
                $: null,
                arg: `${BASE}.2.${itr.key + 1}`,
                map: v => v * 8192
              },
              ingress: {
                $: null,
                arg: `${BASE}.3.${itr.key + 1}`,
                map: v => v * 8192
              }
            }
          }]
        }
      }
    }
  }
};
