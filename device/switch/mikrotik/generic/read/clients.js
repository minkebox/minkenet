function mac(m) {
  return m.replace(/(..)(?!$)/g,'$1:');
}

module.exports = {
  network: {
    clients: {
      $: 'fetch',
      arg: '/!dhost.b',
      transform: v => `$R=${v}`,
      type: 'eval',
      values: {
        $: 'iterate',
        arg: itr => [{
          mac: { $: 'eval', arg: `$R[${itr.index}].adr`, map: mac },
          portnr: `$R[${itr.index}].prt`,
          vlan: `$R[${itr.index}].vid`
        }]
      }
    }
  }
};
