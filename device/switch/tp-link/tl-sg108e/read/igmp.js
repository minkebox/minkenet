module.exports = {
  network: {
    igmp: {
      snoop: {
        $: 'navigate',
        arg: '/IgmpSnoopingRpm.htm',
        frame: 'mainFrame',
        values: {
          $: 'eval',
          arg: 'igmp_ds.state',
          map: {
            1: true,
            0: false
          }
        }
      }
    }
  }
};
