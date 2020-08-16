module.exports = {
  network: {
    physical: {
      port: {
        $: 'foreach',
        arg: itr => [{
          $: 'guard',
          arg: {
            $: 'fetch',
            arg: '/iss/specific/port_settings.html',
            method: 'post',
            params: {
              Gambit: {
                $: 'eval',
                arg: 'top.GAMBIT'
              },
              PORT_NO: `${itr.index + 1};`,
              PORT_DESCRIPTION: {
                $: 'kv',
                arg: `${itr.path}.name`
              },
              PORT_CTRL_MODE: {
                $: 'kv',
                arg: `${itr.path}.enable`,
                map: {
                  true: 1,
                  false: 3
                }
              },
              PORT_CTRL_DUPLEX: {
                $: 'kv',
                arg: `${itr.path}.speed`,
                map: {
                  'auto': 0,
                  '-': 0,
                  '10M (H)': 2,
                  '10M': 1,
                  '100M (H)': 2,
                  '100M': 1
                }
              },
              PORT_CTRL_SPEED: {
                $: 'kv',
                arg: `${itr.path}.speed`,
                map: {
                  'auto': 0,
                  '-': 0,
                  '10M (H)': 1,
                  '10M': 1,
                  '100M (H)': 2,
                  '100M': 2
                }
              },
              FLOW_CONTROL_MODE: {
                $: 'kv',
                arg: `${itr.path}.flowcontrol`,
                map: {
                  true: 4,
                  false: 1
                }
              },
              ACTION: 'apply'
            }
          }
        }]
      }
    }
  }
};
