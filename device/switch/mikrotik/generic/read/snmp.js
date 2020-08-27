function str(v) {
  return Buffer.from(v, 'hex').toString('utf8');
}

module.exports = {
  system: {
    $: 'fetch',
    arg: '/snmp.b',
    type: 'eval+r',
    values: {
      snmp: {
        enable: `!!$R.en`
      },
      location: { $: 'eval', arg: '$R.loc', map: str },
      contact: { $: 'eval', arg: '$R.ci', map: str }
    }
  }
};
