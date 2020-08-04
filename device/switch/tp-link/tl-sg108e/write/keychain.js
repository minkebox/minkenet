module.exports = {
  system: {
    keychain: {
      $: 'guard',
      arg: {
        $: 'fetch',
        arg: '/usr_account_set.cgi',
        params: {
          txt_username: 'admin',
          txt_oldpwd: { $: 'kv', arg: 'system.keychain.password', options: { original: true } },
          txt_userpwd: { $: 'kv', arg: 'system.keychain.password' },
          txt_confirmpwd: { $: 'kv', arg: 'system.keychain.password' }
        }
      }
    }
  }
};
