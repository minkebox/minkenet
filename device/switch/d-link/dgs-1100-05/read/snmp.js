module.exports = {
  system: {
    snmp: {
      $: 'fetch',
      frame: 'mf0',
      arg: {
        $: 'eval',
        arg: `top.RT + 'DS/SNMP_Global.js'`
      },
      type: 'eval',
      values: {
        enable: '!!ds_Snmp[0]'
      }
    }
  }
};

