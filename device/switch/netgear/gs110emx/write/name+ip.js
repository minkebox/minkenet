module.exports = {
  system: {
    $: 'guard',
    key: 'system.name,system.ipv4',
    arg: {
      $: 'fetch',
      arg: `/iss/specific/sysInfo.html`,
      method: 'post',
      params: {
        Gambit: {
          $: 'eval',
          arg: 'top.GAMBIT'
        },
        refreshFlag: 0,
        switch_name: {
          $: 'kv',
          arg: 'system.name',
        },
        dhcp_mode: {
          $: 'kv',
          name: 'system.ipv4.mode',
          map: {
            dhcp: 1,
            static: 2
          }
        },
        IP_ADDRESS: {
          $: 'kv',
          arg: 'system.ipv4.address'
        },
        SUBNET_MASK: {
          $: 'kv',
          arg: 'system.ipv4.netmask'
        },
        GATEWAY_ADDRESS: {
          $: 'kv',
          arg: 'system.ipv4.gateway'
        },
        ACTION: 'Apply'
      }
    }
  }
}
