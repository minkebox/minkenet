module.exports = {
  network: {
    vlans: {
      ivl: {
        $: 'guard',
        arg: {
          $: 'fetch',
          arg: '/sys.b',
          method: 'post',
          wait: false,
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
