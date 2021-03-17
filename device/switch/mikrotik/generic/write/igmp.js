module.exports = {
  network: {
    igmp: {
      snoop: {
        $: 'guard',
        arg: {
          $: 'fetch',
          arg: '/sys.b',
          method: 'post',
          wait: 0.1,
          params: {
            $: 'kv',
            arg: 'network.igmp.snoop',
            map: v => `{igmp:'${v ? '0x01' : '0x00'}'}`
          }
        }
      }
    }
  }
};
