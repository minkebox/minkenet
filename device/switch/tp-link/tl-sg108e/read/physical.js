module.exports = {
  network: {
    physical: {
      port$1: {
        $: 'navigate',
        arg: '/PortStatisticsRpm.htm',
        frame: 'mainFrame',
        values: {
          $: 'iterate',
          arg: itr => [{
            id: {
              $: 'selector',
              arg: `form[name=port_statistics] tr:nth-child(${itr.index + 2}) td:nth-child(1)`,
              map: name => name.split(' ')[1]
            },
            framesize: {
              $: 'literal',
              arg: 16384
            },
            status: {
              $: 'selector',
              arg: `form[name=port_statistics] tr:nth-child(${itr.index + 2}) td:nth-child(3)`,
              map: status => status === 'Link Down' ? 'down' : 'up'
            },
            type: {
              $: 'selector',
              arg: `form[name=port_statistics] tr:nth-child(${itr.index + 2}) td:nth-child(3)`,
              map: {
                '10Half' : '10M',
                '10Full' : '10M',
                '100Half' : '100M',
                '100Full' : '100M',
                '1000Half' : '1G',
                '1000Full' : '1G',
                'Link Down': '-'
              }
            }
          }]
        }
      },
      port$2: {
        $: 'navigate',
        arg: '/PortSettingRpm.htm',
        frame: 'mainFrame',
        type: 'eval',
        values: {
          $: 'iterate',
          arg: itr => [{
            flowcontrol: `!!all_info.fc_cfg[${itr.index}]`,
            speed: {
              $: 'eval',
              arg: `all_info.spd_cfg[${itr.index}]`,
              map: {
                1: 'auto',
                2: '10M (H)',
                3: '10M',
                4: '100M (H)',
                5: '100M',
                6: '1G'
              }
            },
            enable: `!!all_info.state[${itr.index}]`
          }]
        }
      }
    }
  }
};
