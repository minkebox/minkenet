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
                    phyInfJumboFrameEnable: 1,
                    phyInfEAPPassThrough: 2,
                    phyInfBPDUPassThrough: 1,
                    phyInfAdminStatus: 1,
                    phyInfportSetDescription: { $: 'kv', arg: `${itr.path}.name` },
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
