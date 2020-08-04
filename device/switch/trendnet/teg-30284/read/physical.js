module.exports = {
  network: {
    physical: {
      port: {
        $: 'fetch',
        frame: 'myframe',
        arg: '/iss/specific/rpc.js',
        method: 'post',
        params: {
          Gambit: {
            $: 'eval',
            arg: 'GetInputGambit()'
          },
          RPC: JSON.stringify({ method: 'CommonGet', id: 0, params: { Template: 'phyInfEntry' } })
        },
        type: 'jsonp',
        values: {
          $: 'iterate',
          arg: itr => [{
            id: `result[${itr.index}].phyInfIndex`,
            name: `result[${itr.index}].phyInfportSetDescription`,
            status: {
              $: 'jsonp',
              arg: `result[${itr.index}].phyInfLinkStatus`,
              map: {
                1: 'up',
                2: 'down'
              }
            },
            framesize: {
              $: 'jsonp',
              arg: `result[${itr.index}].phyInfJumboFrameEnable`,
              map: {
                1: '10240',
                2: '1500'
              }
            },
            type: {
              $: 'jsonp',
              arg: `result[${itr.index}].phyInfMediaType`,
              map: {
                1: '1G',
                2: '10G'
              }
            },
            jumbo: {
              $: 'jsonp',
              arg: `result[${itr.index}].phyInfJumboFrameEnable`,
              map: {
                1: true,
                2: false
              }
            },
            flowcontrol: {
              $: 'jsonp',
              arg: `result[${itr.index}].phyInfFlowCtrl`,
              map: {
                1: true,
                2: false
              }
            },
            speed: {
              $: 'jsonp',
              arg: `result[${itr.index}].phyInfSpeed`,
              map: {
                4: '10G',
                3: '1G',
                2: '100M',
                1: '10M'
              }
            },
            enable: {
              $: 'jsonp',
              arg: `result[${itr.index}].phyInfAdminStatus`,
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
