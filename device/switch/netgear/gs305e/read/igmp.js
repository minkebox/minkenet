module.exports = {
  network: {
    igmp: {
      $: 'navigate',
      arg: '/igmp.cgi',
      frame: 'maincontent',
      values: {
        snoop: `input[name=status][value="1"]`
      }
    }
  }
};
