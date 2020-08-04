module.exports = {
  system: {
    keychain: {
      $: 'guard',
      arg: {
        $: 'fetch',
        arg: '/iss/specific/password.html',
        method: 'post',
        params: {
          Gambit: { $: 'eval', arg: 'top.GAMBIT' },
          oldPassword: { $: 'kv', arg: 'system.keychain.password', options: { original: true } },
          newPassword: { $: 'kv', arg: 'system.keychain.password' },
          reNewPassword: { $: 'kv', arg: 'system.keychain.password' },
          ACTION: ''
        }
      }
    }
  }
};
