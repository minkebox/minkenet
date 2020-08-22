const BASE = '1.3.6.1.4.1.28866.3.1.12.1.1';

module.exports = {
  network: {
    physical: {
      port: {
        $: 'oid',
        arg: BASE,
        values: {
          $: 'iterate',
          arg: itr => [{
            id: `${BASE}.1.${itr.key + 1}.*`,
            name: `${BASE}.13.${itr.key + 1}.*`,
            status: {
              $: 'jsonp',
              arg: `${BASE}.3.${itr.key + 1}.*`,
              map: {
                1: 'up',
                2: 'down'
              }
            },
            framesize: {
              $: 'jsonp',
              arg: `${BASE}.10.${itr.key + 1}.*`,
              map: {
                1: '9996',
                2: '1518'
              }
            },
            type: {
              $: 'jsonp',
              arg: `${BASE}.2.${itr.key + 1}.*`,
              map: {
                1: '1G',
                2: '10G'
              }
            },
            jumbo: {
              $: 'jsonp',
              arg: `${BASE}.10.${itr.key + 1}.*`,
              map: {
                1: true,
                2: false
              }
            },
            flowcontrol: {
              $: 'jsonp',
              arg: `${BASE}.7.${itr.key + 1}.*`,
              map: {
                1: true,
                2: false
              }
            },
            speed: {
              $: 'jsonp',
              arg: `${BASE}.6.${itr.key + 1}.*`,
              map: {
                4: '10G',
                3: '1G',
                2: '100M',
                1: '10M'
              }
            },
            enable: {
              $: 'jsonp',
              arg: `${BASE}.9.${itr.key + 1}.*`,
              map: {
                1: true,
                2: false
              }
            }
          }]
        }
      }
    }
  }
};
