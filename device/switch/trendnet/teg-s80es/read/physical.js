module.exports = {
  network: {
    physical: {
      $: 'fetch',
      arg: '/DS/Jumbo.js', // Loads the 'ds_JumboEn' into the frame
      values: {
        port: {
          $: 'fetch',
          arg: `/DS/Port.js`,
          values: {
            $: 'iterate',
            arg: itr => [{
              id: {
                $: 'literal',
                arg: `${itr.index + 1}`
              },
              status: {
                $: 'eval',
                arg: `ds_PortSetting[${itr.index}][0]`,
                map: {
                  0: 'down',
                  2: 'up'
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
              type: {
                $: 'eval',
                arg: `ds_PortSetting[${itr.index}][3]`,
                map: {
                  0: '-',
                  1: '10M (H)',
                  2: '10M',
                  3: '100M (H)',
                  4: '100M',
                  5: '1G'
                }
              },
              flowcontrol: `!!ds_PortSetting[${itr.index}][4]`,
              speed: {
                $: 'eval',
                arg: `ds_PortSetting[${itr.index}][2]`,
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
