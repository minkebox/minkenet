module.exports = {
  network: {
    igmp: {
      snoop: {
        $: 'fetch',
        frame: 'mf0',
        arg: {
          $: 'eval',
          arg: `top.RT + 'DS/IGMP.js'`
        },
        type: 'eval',
        values: '!!ds_IGMPSEn'
      }
    }
  }
};
