module.exports = {
  system: {
    snmp: {
      $: 'fetch',
      arg: '/DS/SNMP_Global.js',
      values: {
        enable: '!!ds_Snmp[0]'
      }
    }
  }
};
