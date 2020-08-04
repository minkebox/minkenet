module.exports = {
  system: {
    keychain: {
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
              method: 'BatchPost',
              id: 0,
              params: {
                FuncName: 'UserAccountModify',
                userName: 'admin',
                userPassword: { $: 'kv', arg: 'system.keychain.password' }
              }
            }
          }
        }
      }
    }
  }
};
