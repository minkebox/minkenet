module.exports = {
  network: {
    igmp: {
      snoop: {
        $: 'navigate',
        arg: `/userRpm/IgmpConfigRpm.htm`,
        frame: 'mainFrame',
        values: {
          $: 'eval',
          arg: `!!enable`
        }
      }
    }
  }
};
