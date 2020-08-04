module.exports = {
  system: {
    ipv4: {
      $: 'guard',
      arg: {
        $: 'fetch',
        arg: '/userRpm/VlanInterfaceEditRpm.htm',
        wait: 1,
        params: {
          apply: 'true',
          id: '1',
          type: '1',
          admin_status: '1',
          mode: {
            $: 'kv',
            arg: 'system.ipv4.mode',
            map: {
              static: '1',
              dhcp: '2'
            }
          },
          ip: { $: 'kv', arg: 'system.ipv4.address' },
          mask: { $: 'kv', arg: 'system.ipv4.netmask' },
          text: '',
          _tid_: {
            $: 'eval',
            arg: 'top.g_tid'
          }
        }
      }
    }
  }
};
