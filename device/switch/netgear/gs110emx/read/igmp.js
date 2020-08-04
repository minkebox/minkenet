module.exports = {
  network: {
    igmp: {
      $: 'navigate',
      arg: {
        $: 'eval',
        arg: `"/iss/specific/igs_conf.html?Gambit=" + top.GAMBIT`
      },
      frame: 'maincontent',
      values: {
        snoop: `input[name=GLOBAL_STATUS][value="1"]`
      }
    }
  }
};
