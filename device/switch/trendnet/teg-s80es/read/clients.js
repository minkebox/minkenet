module.exports = {
  network: {
    clients: {
      $: 'fetch',
      arg: `/DS/DFT.js`,
      values: {
        $: 'iterate',
        arg: itr => [{
          mac: { $: 'eval', arg: `ds_DFT[${itr.index}][1]`, map: mac => mac.toLowerCase() },
          vlan: `ds_DFT[${itr.index}][2]`,
          portnr: `ds_DFT[${itr.index}][0] - 1`
        }]
      }
    }
  }
};
