module.exports = {
  system: {
    $: 'guard',
    key: 'system.name,system.location,system.contact',
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
              Template: 'sysSystemInfo',
              sysInfoSysName: { $: 'kv', arg: 'system.name' },
              sysInfoSysLocation: { $: 'kv', arg: 'system.location' },
              sysInfoSysContact: { $: 'kv', arg: 'system.contact' }
            }
          }
        }
      }
    }
  }
};
