module.exports = {
  system: {
    $: 'fetch',
    frame: 'mf0',
    arg: {
      $: 'eval',
      arg: `top.RT + 'DS/Switch.js'`
    },
    type: 'eval',
    values: {
      name: 'ds_SysInfo[0]',
      location: `ds_SysInfo[1]`,
      contact: `ds_SysInfo[2]`,
      macAddress: {
        0: {
          $: 'eval',
          arg: 'g_DeviceInfo[2]',
          map: mac => mac.replace(/-/g,':').toLowerCase()
        }
      },
      firmware: {
        version: 'g_SwitchInfo[1]'
      },
      hardware: {
        version: 'g_DeviceInfo[0]'
      },
      ipv4: {
        mode: {
          $: 'eval',
          arg: 'ds_IPInfo[0]',
          map: {
            0: 'static',
            1: 'dhcp'
          }
        },
        address: 'ds_IPInfo[1]',
        netmask: 'ds_IPInfo[2]',
        gateway: 'ds_IPInfo[3]'
      }
    },
  }
};
