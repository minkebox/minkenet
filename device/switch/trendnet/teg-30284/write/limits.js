const BASE = '1.3.6.1.4.1.28866.3.1.3.1.1';

module.exports = {
  network: {
    physical: {
      port: {
        $: 'foreach',
        arg: itr => [{
          limit: {
            egress: {
              $: 'guard',
              arg: {
                $: 'oid+set',
                arg: `${BASE}.2.${itr.key + 1}`,
                map: v => Math.ceil(v / 8192)
              }
            },
            ingress: {
              $: 'guard',
              arg: {
                $: 'oid+set',
                arg: `${BASE}.3.${itr.key + 1}`,
                map: v => Math.ceil(v / 8192)
              }
            }
          }
        }]
      }
    }
  }
};
