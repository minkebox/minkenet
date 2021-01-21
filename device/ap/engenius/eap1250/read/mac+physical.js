module.exports = {
  $1: {
    $: 'fetch',
    arg: {
      $: 'eval',
      arg: `window.location.pathname.replace(/(tok=.*admin).*/,'$1')+'/network/iface_status2/lan'`
    },
    type: 'jsonp',
    values: {
      system: {
        macAddress: {
          0: {
            $: 'jsonp',
            arg: '$[0].macaddr',
            map: Maps.toMacAddress
          }
        }
      },
      network: {
        physical: {
          port: {
            '0': {
              id: '$[0].id',
              status: {
                $: 'jsonp',
                arg: '$[0].is_up',
                map: {
                  true: 'up',
                  false: 'down'
                }
              },
              framesize: {
                $: 'literal',
                arg: '1500'
              }
            }
          }
        }
      }
    }
  }
};
