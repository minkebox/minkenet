module.exports = {
  system: {
    name: {
      $: 'guard',
      arg: {
        $: 'fetch',
        arg: {
          $: 'eval',
          arg: `window.location.pathname.replace(/(tok=.*admin).*/,'$1')+'/network/wireless_device'`
        },
        method: 'post',
        params: {
          'cbid.system.system.SystemName': { $: 'kv' }
        }
      }
    }
  }
};
