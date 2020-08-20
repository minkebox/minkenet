module.exports = {
  system: {
    keychain: {
      $: 'guard',
      arg: {
        $: 'fetch',
        arg: {
          $: 'eval',
          arg: `window.location.pathname.replace(/(tok=.*admin).*/,'$1')+'/system/admin'`
        },
        method: 'post',
        params: {
          usr_name: 'admin',
          cur_pw: { $: 'kv', arg: 'system.keychain.password', options: { original: true } },
          pw1: { $: 'kv', arg: 'system.keychain.password' },
          pw2: { $: 'kv', arg: 'system.keychain.password' },
          submitType: 1,
          'cbi.apply': 'Apply'
        }
      }
    }
  }
}
