module.exports = {
  system: {
    $: 'guard',
    arg: {
      $: 'fetch',
      arg: '/cgi/set_sys.cgi',
      method: 'post',
      params: {
        sys: { $: 'kv', arg: 'system.name' },
        loc: { $: 'kv', arg: 'system.locatiom' },
        con: { $: 'kv', arg: 'system.contact' },
        SysTimeout: '36000'
      }
    }
  }
};
