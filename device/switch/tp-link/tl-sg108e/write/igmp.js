module.exports = {
  network: {
    igmp: {
      snoop: {
        $: `guard`,
        arg: {
          $: `fetch`,
          arg: `/igmpSnooping.cgi`,
          params: {
            igmp_mode: {
              $: `kv`,
              arg: `network.igmp.snoop`,
              map: {
                true: 1,
                false: 0
              }
            },
            reportSu_mode: 0,
            Apply: 'Apply'
          }
        }
      }
    }
  }
};
