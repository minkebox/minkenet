module.exports = {
  network: {
    physical: {
      port: {
        $: 'foreach',
        arg: itr => [{
          $: `guard`,
          key : `${itr.path}.enable,${itr.path}.speed,${itr.path}.flowcontrol`,
          arg: {
            $: `fetch`,
            arg: `/port_setting.cgi`,
            wait: 1, // Sometimes hangs, so best we only wait for a little while before moving on
            params: {
              portid: itr.index + 1,
              state: {
                $: 'kv',
                arg: `${itr.path}.enable`,
                map: {
                  true: 1,
                  false: 0
                }
              },
              speed: {
                $: 'kv',
                arg: `${itr.path}.speed`,
                map: {
                  'auto': 1,
                  '10M (H)': 2,
                  '10M': 3,
                  '100M (H)': 4,
                  '100M': 5,
                  '1G': 6
                }
              },
              flowcontrol: {
                $: 'kv',
                arg: `${itr.path}.flowcontrol`,
                map: {
                  true: 1,
                  false: 0
                }
              },
              apply: 'Apply'
            }
          }
        }]
      }
    }
  }
};
