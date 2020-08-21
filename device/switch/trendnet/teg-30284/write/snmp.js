module.exports = {
  system: {
    snmp: {
      enable: {
        $: 'guard',
        arg: {
          $: 'fetch',
          arg: '/iss/specific/rpc.js',
          frame: 'myframe',
          method: 'post',
          params: {
            Gambit: {
              $: 'eval',
              arg: 'GetInputGambit()'
            },
            RPC: {
              $: 'tojson',
              arg: {
                method: 'CommonSet',
                id: 0,
                params: {
                  Template: 'snmpGlobal',
                  snmpGlobalState: {
                    $: 'kv',
                    arg: 'system.snmp.enable',
                    map: {
                      true: 1,
                      false: 2
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
