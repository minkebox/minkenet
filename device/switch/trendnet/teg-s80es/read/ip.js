module.exports = {
  system: {
    ipv4: {
      $: 'fetch',
      arg: `/DS/IPv4.js`,
      values: {
        mode: {
          $: 'eval',
          arg: `ds_IPInfo[0]`,
          map: {
            0: 'static',
            1: 'dhcp'
          }
        },
        address: `ds_IPInfo[1]`,
        netmask: `ds_IPInfo[2]`,
        gateway: `ds_IPInfo[3]`
      }
    }
  }
};
