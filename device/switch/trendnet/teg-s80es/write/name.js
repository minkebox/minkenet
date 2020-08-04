module.exports = {
  system: {
    $: 'guard',
    arg: {
      $: 'fetch',
      arg: '/cgi/set_sys.cgi',
      method: 'post',
      params: {
        sys: { $: 'kv', arg: 'system.name' },
        loc: { $: 'kv', arg: 'system.location' },
        con: { $: 'kv', arg: 'system.contact' }
      }
    }
  }
};
