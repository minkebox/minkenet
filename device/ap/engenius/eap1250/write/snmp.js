module.exports = {
  system: {
    snmp: {
      enable: {
        $: 'guard',
        arg: {
          $: 'fetch',
          arg: {
            $: 'eval',
            arg: `window.location.pathname.replace(/(tok=.*admin).*/,'$1')+'/network/advanced'`
          },
          method: 'post',
          params: {
            'SnmpEnable': { $: 'kv', map: { true: 1, false: 0 } }
          }
        }
      }
    }
  }
};
