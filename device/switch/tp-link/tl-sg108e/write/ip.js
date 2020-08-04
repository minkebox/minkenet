module.exports = {
  system: {
    ipv4: {
      $: `guard`,
      arg: {
        $: `fetch`,
        arg: `/ip_setting.cgi`,
        wait: 1,
        params: {
          dhcpSetting: {
            $: `kv`,
            arg: `system.ipv4.mode`,
            map: {
              static: 'disable',
              dhcp: 'enable'
            }
          },
          ip_address: { $: `kv`, arg: `system.ipv4.address` },
          ip_netmask: { $: `kv`, arg: `system.ipv4.netmask` },
          ip_gateway: { $: `kv`, arg: `system.ipv4.gateway` }
        }
      }
    }
  }
};
