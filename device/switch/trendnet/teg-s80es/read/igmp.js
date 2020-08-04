module.exports = {
  network: {
    igmp: {
      snoop: {
        $: 'fetch',
        arg: '/DS/IGMP.js',
        values: { $: 'eval', arg: '!!ds_IGMPSEn' }
      }
    }
  }
};
