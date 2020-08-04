module.exports = {
  system: {
    keychain: {
      $: 'guard',
      arg: {
        $: 'fetch',
        arg: '/userRpm/UserManageRpm.htm',
        params: {
          type: 'modify',
          username: 'admin',
          usertype: 3,
          userstatus: 0,
          pwdmode: 1,
          changepwd: true,
          oldpwd: { $: 'kv', arg: 'system.keychain.password', options: { original: true } },
          pwd: { $: 'kv', arg: 'system.keychain.password' },
          confirmpwd: { $: 'kv', arg: 'system.keychain.password' },
          _tid_: {
            $: 'eval',
            arg: 'top.g_tid'
          }
        }
      }
    }
  }
};
