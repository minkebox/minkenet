module.exports = {
  network: {
    vlans: {
      ivl: {
        $: 'guard',
        arg: {
          $: 'fetch',
          arg: '/sys.b',
          method: 'post',
          wait: 0.1,
          params: {
            $: 'kv',
            arg: 'network.vlans.ivl',
            map: v => `{ivl:'${v ? '0x01' : '0x00'}'}`
          }
        }
      }
    }
  }
};
