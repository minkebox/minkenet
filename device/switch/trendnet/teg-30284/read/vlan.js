function c(str) {
  return str.split(':').slice(0, 4).map(v => parseInt(v, 16))
}

module.exports = {
  network: {
    vlans: {
      ivl: {
        $: 'fetch',
        frame: 'myframe',
        arg: '/iss/specific/rpc.js',
        method: 'post',
        params: {
          Gambit: {
            $: 'eval',
            arg: 'GetInputGambit()'
          },
          RPC: JSON.stringify({ method: 'CommonGet', id: 0, params: { Template: 'vlanGlobal' } })
        },
        type: 'jsonp',
        values: {
          $: 'jsonp', arg: `result.vlanFwdTabMode`, map: { 0: false, 1: true }
        }
      },
      vlan$1: {
        $: 'fetch',
        frame: 'myframe',
        arg: '/iss/specific/rpc.js',
        method: 'post',
        params: {
          Gambit: {
            $: 'eval',
            arg: 'GetInputGambit()'
          },
          RPC: JSON.stringify({ method: 'CommonGet', id: 0, params: { Template: 'dot1qVlanStaticEntry' } })
        },
        type: 'jsonp',
        values: {
          $: 'iterate',
          arg: itr => [
            `result[${itr.index}].dot1qVlanStaticVlanId`,
            {
              name: `result[${itr.index}].dot1qVlanStaticName`,
              port: {
                $: 'fn',
                arg: async function() {
                  const r = {};
                  const ports = c(await this.eval('jsonp', `result[${itr.index}].dot1qVlanStaticEgressPorts`));
                  const untagged = c(await this.eval('jsonp', `result[${itr.index}].dot1qVlanStaticUntaggedPorts`));
                  let portnr = 0;
                  for (let i = 0; i < 4; i++) {
                    for (let j = 0x80; j; j = j >>> 1) {
                      if (ports[i] & j) {
                        r[portnr] = {
                          tagged: (untagged[i] & j) ? false : true
                        };
                      }
                      portnr++;
                    }
                  }
                  return r;
                }
              }
            }
          ]
        }
      },
      vlan$2: {
        $: 'fetch',
        frame: 'myframe',
        arg: '/iss/specific/rpc.js',
        method: 'post',
        params: {
          Gambit: {
            $: 'eval',
            arg: 'GetInputGambit()'
          },
          RPC: JSON.stringify({ method: 'CommonGet', id: 0, params: { Template: 'dot1qVlanStaticEntry' } })
        },
        type: 'jsonp',
        values: {
          $: 'iterate',
          arg: itr => [
            `result[${itr.index}].dot1qMgmtVlanId`,
            {
              management: {
                $: 'jsonp',
                arg: `result[${itr.index}].dot1qMgmtVlanStatus`,
                map: {
                  1: true,
                  2: false
                }
              }
            }
          ]
        }
      },
      pvid: {
        $: 'fetch',
        frame: 'myframe',
        arg: '/iss/specific/rpc.js',
        method: 'post',
        params: {
          Gambit: {
            $: 'eval',
            arg: 'GetInputGambit()'
          },
          RPC: JSON.stringify({ method: 'CommonGet', id: 0, params: { Template: 'dot1qPortVlanEntry' } })
        },
        type: 'jsonp',
        values: {
          $: 'iterate',
          arg: itr => [{
            pvid: `result[${itr.index}].dot1qPvid`
          }]
        }
      }
    }
  }
};
