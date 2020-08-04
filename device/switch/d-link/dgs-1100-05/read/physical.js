module.exports = {
  network: {
    physical: {
      port: {
        $: 'fetch',
        frame: 'mf0',
        arg: {
          $: 'eval',
          arg: `top.RT + 'DS/Jumbo.js'`
        },
        type: 'eval',
        values: {
          $: 'fetch',
          frame: 'mf0',
          arg: {
            $: 'eval',
            arg: `top.RT + 'DS/Port.js'`
          },
          type: 'eval',
          values: {
            $: 'iterate',
            arg: itr => [{
              id: `${itr.index + 1}`,
              name: `ds_PortSetting[${itr.index}][5]`,
              status: {
                $: 'eval',
                arg: `ds_PortSetting[${itr.index}][0]`,
                map: {
                  2: 'up',
                  1: 'error',
                  0: 'down'
                }
              },
              type: {
                $: 'eval',
                arg: `ds_PortSetting[${itr.index}][4]`,
                map: {
                  0: '-',
                  1: '10M',
                  2: '10M',
                  3: '100M',
                  4: '100M',
                  5: '1G',
                  6: '1G'
                }
              },
              framesize: {
                $: 'eval',
                arg: 'ds_JumboEn',
                map: {
                  0: 1518,
                  1: 9216
                }
              },
              flowcontrol: `!!ds_PortSetting[${itr.index}][2]`,
              speed: {
                $: 'eval',
                arg: `ds_PortSetting[${itr.index}][4]`,
                map: {
                  0: 'auto',
                  1: '10M (H)',
                  2: '10M',
                  3: '100M (H)',
                  4: '100M',
                  5: '1G'
                }
              },
              enable: `!!ds_PortSetting[${itr.index}][1]`
            }]
          }
        }
      }
    }
  }
};
