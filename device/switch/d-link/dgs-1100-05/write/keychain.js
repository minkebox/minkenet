module.exports = {
  system: {
    keychain: {
      $: 'guard',
      arg: {
        $: 'fetch',
        arg: '/cgi/changing_pw.cgi',
        method: 'post',
        params: {
          old_pass: { $: 'kv', arg: 'system.keychain.password', options: { original: true } },
          new_pass: { $: 'kv', arg: 'system.keychain.password' },
          renew_pass: { $: 'kv', arg: 'system.keychain.password' }
        }
      }
    }
  }
};
