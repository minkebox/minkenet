module.exports = {
  system$1: {
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
            Template: 'sysSystemInfo'
          }
        }
      }
    },
    type: 'jsonp',
    values: {
      name: 'result.sysInfoSysName',
      location: 'result.sysInfoSysLocation',
      contact: 'result.sysInfoSysContact',
      firmware: {
        version: 'result.sysInfoFirmwareVersion'
      }
    }
  },
  system$2: {
    macAddress: {
      0: {
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
                Template: 'sysSystemCtrl'
              }
            }
          }
        },
        type: 'jsonp',
        values: 'result.systemSwitchBaseMacAddress'
      }
    }
  }
};
