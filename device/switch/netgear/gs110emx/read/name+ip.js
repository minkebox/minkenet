module.exports = {
  system: {
    $: 'navigate',
    arg: {
      $: 'eval',
      arg: `"/iss/specific/sysInfo.html?Gambit=" + top.GAMBIT`
    },
    frame: 'maincontent',
    values: {
      name: `#tbl1 input[name=switch_name]`,
      macAddress: {
        0: '#tbl1 tr:nth-child(4) td:nth-child(2)'
      },
      firmware: {
        version: '#tbl1 tr:nth-child(5) td:nth-child(2)'
      },
      ipv4: {
        mode: {
          $: 'selector',
          arg: '#tbl1 select[name=dhcp_mode]',
          map: {
            1: 'dhcp',
            2: 'static'
          }
        },
        address: '#tbl1 input[name=IP_ADDRESS]',
        netmask: '#tbl1 input[name=SUBNET_MASK]',
        gateway: '#tbl1 input[name=GATEWAY_ADDRESS]'
      }
    }
  }
};
