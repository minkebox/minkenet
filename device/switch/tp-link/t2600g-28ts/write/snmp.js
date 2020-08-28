module.exports = {
  system: {
    snmp: {
      enable: {
        $: 'guard',
        arg: {
          $: 'fetch',
          arg: '/userRpm/SnmpGlobalRpm.htm',
          params: {
            snmpState: {
              $: 'kv',
              arg: 'system.snmp.enable',
              map: {
                true: 1,
                false: 0
              }
            },
            button: 'stateSubmit',
            _tid_: {
              $: 'eval',
              arg: 'top.g_tid'
            }
          }
        }
      }
    }
  }
};
