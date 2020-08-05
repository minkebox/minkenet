module.exports = {
  $: 'fetch',
  arg: {
    $: 'eval',
    arg: `window.location.pathname.replace(/(tok=.*admin).*/,'$1')+'/network/iface_status2/eth1'`
  },
  type: 'jsonp',
  values: {
    network: {
      physical: {
        port: {
          '0': {
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
        }
      }
    }
  }
};
