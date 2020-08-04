module.exports = {
  system: {
    ipv4: {
      $: 'guard',
      arg: {
        $: 'fetch',
        arg: '/cgi/set_ip.cgi',
        method: 'post',
        params: {
          ip: { $: 'kv', arg: 'system.ipv4.address' },
          submask: { $: 'kv', arg: 'system.ipv4.netmask' },
          gateway: { $: 'kv', arg: 'system.ipv4.gateway' },
          dhcp: {
            $: 'kv',
            arg: 'system.ipv4.mode',
            map: {
              static: '0',
              dhcp: '1'
            }
          },
          dhcptm: '7'
        }
      }
    }
  }
};
