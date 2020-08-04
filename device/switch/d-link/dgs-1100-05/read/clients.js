module.exports = {
  network: {
    clients: {
      $: 'fetch',
      frame: 'mf0',
      arg: {
        $: 'eval',
        arg: `top.RT + 'DS/DFT.js'`
      },
      type: 'eval',
      values: {
        $: 'iterate',
        arg: itr => [{
          mac: { $: 'eval', arg: `ds_DFT[${itr.index}][1]`, map: mac => mac.replace(/-/g,':').toLowerCase() },
          vlan: `ds_DFT[${itr.index}][2]`,
          portnr: `ds_DFT[${itr.index}][0] - 1`
        }]
      }
    }
  }
};
