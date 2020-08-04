module.exports = {
  system: {
    $: 'guard',
    arg: {
      $: 'fetch',
      arg: '/userRpm/SystemDescriRpm.htm',
      params: {
        sysName: { $: 'kv', arg: 'system.name' },
        sysLocation: { $: 'kv', arg: 'system.location' },
        sysContact: { $: 'kv', arg: 'system.contact' },
        submit: 'Apply',
        _tid_: {
          $: 'eval',
          arg: 'top.g_tid'
        }
      }
    }
  }
};
