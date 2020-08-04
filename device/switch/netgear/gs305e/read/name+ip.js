module.exports = {
  system: {
    $: 'navigate',
    arg: '/switch_info.cgi',
    frame: 'maincontent',
    values: {
      name: `#switch_name`,
      macAddress: {
        0: {
          $: `selector`,
          arg: `#tbl2 tr:nth-child(4) td:last-child`,
          map: mac => mac.toLowerCase()
        }
      },
      firmware: {
        version: `#tbl2 tr:nth-child(6) td:last-child`,
      },
      ipv4: {
        mode: {
          $: `selector`,
          arg: `#dhcpMode`,
          map: {
            0: 'static',
            1: 'dhcp'
          }
        },
        address: `#ip_address`,
        netmask: `#subnet_mask`,
        gateway: `#gateway_address`
      }
    }
  }
};
