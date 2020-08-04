module.exports = {
  network: {
    igmp: {
      snoop: {
        $: 'guard',
        arg: {
          $: 'fetch',
          arg: '/cgi/IGMPSNState.cgi',
          method: 'post',
          params: {
            IGS: {
              $: 'kv',
              map: {
                true: 1,
                false: 0
              }
            }
          }
        }
      }
    }
  }
};
