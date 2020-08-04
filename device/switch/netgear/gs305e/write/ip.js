module.exports = {
  system: {
    //
    // IP
    // Note: This will change the IP address which means you will *not* be able to talk
    // to the device after this. Put it at the end!
    //
    ipv4: {
      $: 'guard',
      arg: {
        $: 'fetch',
        arg: '/switch_info.cgi',
        method: 'post',
        frame: 'maincontent',
        wait: 1,
        params: {
          dhcpMode: {
            $: 'kv',
            arg: 'system.ipv4.mode',
            map: {
              static: '0',
              dhcp: '1'
            }
          },
          ip_address: { $: 'kv', arg: 'system.ipv4.address' },
          subnet_mask: { $: 'kv', arg: 'system.ipv4.netmask' },
          gateway_address: { $: 'kv', arg: 'system.ipv4.gateway' },
          hash: { $: 'selector', arg: '#hash' }
        }
      }
    }
  }
};
