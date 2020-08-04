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
            map: mac => mac.toLowerCase()
          }
        }
      },
      network: {
        physical: {
          port: [
            {
              id: '$[0].id',
              status: {
                $: 'jsonp',
                arg: '$[0].is_up',
                map: {
                  true: 'up',
                  false: 'down'
                }
              },
              statistics: {
                rx: {
                  bytes: '$[0].rx_bytes',
                  packets: '$[0].rx_packets'
                },
                tx: {
                  bytes: '$[0].tx_bytes',
                  packets: '$[0].tx_packets'
                }
              }
            }
          ]
        }
      }
    }
  }
};
