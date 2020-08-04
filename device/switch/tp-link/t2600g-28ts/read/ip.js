module.exports = {
  system: {
    ipv4: {
      $: 'navigate',
      arg: `/userRpm/VlanInterfaceDetailRpm.htm`,
      frame: 'mainFrame',
      params: {
        id: '1',
        type: '1',
        _tid_: {
          $: 'eval',
          arg: 'top.g_tid'
        }
      },
      type: 'eval',
      values: {
        mode: {
          $: 'eval',
          arg: `intfBasicInfo.mode`,
          map: {
            DHCP: 'dhcp',
            Static: 'static'
          }
        },
        address: `intfBasicInfo.ip.split('/')[0]`,
        netmask: `intfBasicInfo.ip.split('/')[1]`
      }
    }
  }
};
