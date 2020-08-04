module.exports = {
  system: {
    $: 'navigate',
    arg: '/SystemInfoRpm.htm',
    frame: 'mainFrame',
    values: {
      name: `#tDevDscr`,
      firmware: {
        version: `#sp_firewareversion`
      },
      hardware: {
        version: `#sp_hardwareversion`
      },
      macAddress: {
        0: {
          $: 'selector',
          arg: '#sp_macaddress',
          map: mac => mac.toLowerCase(mac)
        }
      },
      ipv4: {
        address: '#sp_ipaddress',
        netmask: '#sp_netmask',
        gateway: '#sp_gateway',
        mode: {
          $: 'navigate',
          arg: '/IpSettingRpm.htm',
          values: {
            $: 'selector',
            arg: '#check_dhcp',
            map: {
              enable: 'dhcp',
              disable: 'static'
            }
          }
        }
      }
    }
  }
};
