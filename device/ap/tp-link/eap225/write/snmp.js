//
// Note. Used to enable SNMP, so we can't use OIDs here.
//
module.exports = {
  system: {
    snmp: {
      enable: {
        $: 'guard',
        arg: {
          $: 'fetch',
          arg: '/data/snmp.json',
          method: 'post',
          params: {
            operation: 'write',
            snmpEnable: { $: 'kv', arg: 'system.snmp.enable' }
          }
        }
      }
    }
  }
};
