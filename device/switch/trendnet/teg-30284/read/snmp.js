module.exports = {
  system: {
    snmp: {
      enable: {
        $: 'fetch',
        frame: 'myframe',
        arg: '/iss/specific/rpc.js',
        method: 'post',
        params: {
          Gambit: {
            $: 'eval',
            arg: 'GetInputGambit()'
          },
          RPC: {
            $: 'tojson',
            arg: {
              method: 'CommonGet',
              id: 0,
              params: {
                Template: 'snmpGlobal'
              }
            }
          }
        },
        type: 'jsonp',
        values: {
          $: 'jsonp',
          arg: `result.snmpGlobalState`,
          map: {
            2: false,
            1: true
          }
        }
      }
    }
  }
};
