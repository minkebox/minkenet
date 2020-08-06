module.exports = {
  network: {
    physical: {
      port: {
        $: 'foreach',
        arg: itr => [{
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
                  method: "BatchPost",
                  id: 0,
                  params: [{
                    phyInfJumboFrameEnable: {
                      $: 'kv',
                      arg: `${itr.path}.jumbo`,
                      map: {
                        true: 1,
                        false: 2
                      }
                    },
                    phyInfEAPPassThrough: 2,
                    phyInfBPDUPassThrough: 1,
                    phyInfSpeed: {
                      $: 'kv',
                      arg: `${itr.path}.speed`,
                      map: {
                        '10G': 4,
                        '1G': 3,
                        '100M': 2,
                        '10M': 1
                      }
                    },
                    phyInfAdminStatus: {
                      $: 'kv',
                      arg: `${itr.path}.enable`,
                      map: {
                        true: 1,
                        false: 2
                      }
                    },
                    phyInfFlowCtrl: {
                      $: 'kv',
                      arg: `${itr.path}.flowcontrol`,
                      map: {
                        true: 1,
                        false: 2
                      }
                    },
                    phyInfportSetDescription: {
                      $: 'kv',
                      arg: `${itr.path}.name`
                    },
                    phyInfIndex: itr.index + 1,
                    phyInfMediaType: 1,
                    FuncName: "Port_Set"
                  }]
                }
              }
            }
          }
        }]
      }
    }
  }
};
