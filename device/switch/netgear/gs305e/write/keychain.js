module.exports = {
  system: {
    keychain: {
      $: 'guard',
      arg: {
        $: 'fetch',
        arg: '/user.cgi',
        method: 'post',
        frame: 'maincontent',
        params: {
          oldPassword: { $: 'kv', arg: 'system.keychain.password', options: { original: true } },
          newPassword: { $: 'kv', arg: 'system.keychain.password' },
          reNewPassword: { $: 'kv', arg: 'system.keychain.password' },
          hash: { $: 'selector', arg: '#hash' }
        }
      }
    }
  }
};
