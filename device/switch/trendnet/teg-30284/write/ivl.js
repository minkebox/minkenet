module.exports = {
  network: {
    vlans: {
      ivl: {
        $: 'guard',
        arg: {
          $: 'fetch',
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
                method: 'CommonSet',
                id: 0,
                params: [{
                  vlanFwdTabMode: {
                    $: 'kv',
                    map: {
                      true: '1',
                      false: '0'
                    }
                  },
                  Template: 'vlanGlobal'
                }]
              }
            }
          }
        }
      }
    }
  }
};
