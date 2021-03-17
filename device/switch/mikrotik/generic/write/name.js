module.exports = {
  system: {
    name: {
      $: 'guard',
      arg: {
        $: 'fetch',
        arg: '/sys.b',
        method: 'post',
        wait: 0.1,
        params: {
          $: 'kv',
          arg: 'system.name',
          map: s => `{id:'${Buffer.from(s).toString('hex')}'}`
        }
      }
    }
  }
};
