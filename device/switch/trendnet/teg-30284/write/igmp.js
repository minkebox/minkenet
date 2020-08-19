module.exports = {
  network: {
    igmp: {
      snoop: {
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
                method: 'BatchPost',
                id: 0,
                params: [{
                  igsStatus: {
                    $: 'kv',
                    map: {
                      true: '1',
                      false: '2'
                    }
                  },
                  //igsHostPortPurgeInterval: '260',
                  //igsCfgQuerierStatus: '2',
                  //igsQuerierQueryInterval: '125',
                  //igsQueryMaxResponseTime: '10',
                  //igsRobustnessValue: '2',
                  //igsGrpQueryInterval: '1',
                  //igsRouterTimeout: '250',
                  //igsQuerierVersion: '2',
                  //igsCfgFastLeaveStatus: '1',
                  FuncName: 'IGSSystem_Set'
                }]
              }
            }
          }
        }
      }
    }
  }
};
