module.exports = {
  system: {
    snmp: {
      enable: {
        $: 'navigate',
        arg: '/userRpm/SnmpGlobalRpm.htm',
        frame: 'mainFrame',
        values: {
          $: 'eval',
          arg: '!!gSNMPv3GloConfInfo[3]'
        }
      }
    }
  }
};
