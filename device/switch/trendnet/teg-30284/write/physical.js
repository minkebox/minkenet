const BASE = '1.3.6.1.4.1.28866.3.1.12.1.1';

module.exports = {
  network: {
    physical: {
      port$1: {
        $: 'foreach',
        keys: '0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23',
        arg: itr => [{
          $: 'guard',
          arg: {
            name: {
              $: 'oid+set',
              arg: `${BASE}.13.${itr.key + 1}.1`
            },
            jumbo: {
              $: 'oid+set',
              arg: `${BASE}.10.${itr.key + 1}.1`,
              map: {
                true: 1,
                false: 2
              }
            },
            flowcontrol: {
              $: 'oid+set',
              arg: `${BASE}.7.${itr.key + 1}.1`,
              map: {
                true: 1,
                false: 2
              }
            },
            enable: {
              $: 'oid+set',
              arg: `${BASE}.9.${itr.key + 1}.1`,
              map: {
                true: 1,
                false: 2
              }
            }
          }
        }]
      },
      port$2: {
        $: 'foreach',
        keys: '24,25,26,27',
        arg: itr => [{
          $: 'guard',
          arg: {
            name: {
              $: 'oid+set',
              arg: `${BASE}.13.${itr.key + 1}.2`
            },
            jumbo: {
              $: 'oid+set',
              arg: `${BASE}.10.${itr.key + 1}.2`,
              map: {
                true: 1,
                false: 2
              }
            },
            flowcontrol: {
              $: 'oid+set',
              arg: `${BASE}.7.${itr.key + 1}.2`,
              map: {
                true: 1,
                false: 2
              }
            },
            enable: {
              $: 'oid+set',
              arg: `${BASE}.9.${itr.key + 1}.2`,
              map: {
                true: 1,
                false: 2
              }
            }
          }
        }]
      }
    }
  }
};

