module.exports = {
  network: {
    igmp: {
      snoop: {
        $: 'guard',
        arg: {
          $: 'fetch',
          arg: '/igmp.cgi',
          method: 'post',
          frame: 'maincontent',
          params: {
            status: {
              $: 'kv',
              map: {
                true: 1,
                false: 0
              }
            },
            hash: { $: 'selector', arg: '#hash' }
          }
        }
      }
    }
  }
};
