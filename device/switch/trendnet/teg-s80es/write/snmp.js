module.exports = {
  system: {
    snmp: {
      enable: {
        $: 'guard',
        arg: {
          $: 'fetch',
          arg: '/cgi/snmp_global.cgi',
          method: 'post',
          params: {
            item: '00000',
            Trap: 0,
            Snmp: {
              $: 'kv',
              map: {
                true: 1,
                false: 0
              }
            }
          }
        }
      }
    }
  }
};
