module.exports = {
  $: 'navigate',
  arg: '/userRpm/SystemInfoRpm.htm',
  frame: 'mainFrame',
  values: {
    system: {
      name: `#sp_sysInfo1`,
      location: `#sp_sysInfo2`,
      contact: `#sp_sysInfo3`,
      macAddress: {
        0: {
          $: 'selector',
          arg: `#sp_sysInfo7`,
          map: Maps.toMacAddress
        }
      },
      firmware: {
        version: `#sp_sysInfo5`
      },
      hardware: {
        version: `#sp_sysInfo4`
      },
    },
    network: {
      physical: {
        port$1: {
          $: 'iterate',
          arg: itr => [{
            id: {
              $: 'eval',
              arg: `gPortData.port_status[${itr.index}][0]`
            },
            status: {
              $: 'eval',
              arg: `gPortData.port_status[${itr.index}][1]`,
              map: {
                1: 'up',
                0: 'down'
              }
            },
            type: {
              $: 'eval',
              arg: `gPortData.port_status[${itr.index}][2]`,
              map: {
                1000 : '1G'
              }
            }
          }]
        },
        port$2: {
          $: 'navigate',
          arg: '/userRpm/PortStatusSetRpm.htm',
          frame: 'mainFrame',
          type: 'eval',
          values: {
            $: 'iterate',
            arg: itr => [{
              name: `info[1][${itr.index}][2]`,
              framesize: {
                $: 'eval',
                arg: `info[1][${itr.index}][7]`,
                map: {
                  0: 1518,
                  1: 9216
                }
              },
              flowcontrol: `!!info[1][${itr.index}][6]`,
              speed: {
                $: 'eval',
                arg: `!!info[1][${itr.index}][4]`,
                map: {
                  0: 'auto',
                  1: '10M',
                  2: '100M',
                  3: '1G'
                }
              },
              enable: `!!info[1][${itr.index}][3]`,
              jumbo: `!!info[1][${itr.index}][7]`
            }]
          }
        }
      }
    }
  }
};
