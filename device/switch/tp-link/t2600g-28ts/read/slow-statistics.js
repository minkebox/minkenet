module.exports = {
  network: {
    physical: {
      port: {
        $: 'iterate',
        limit: 28,
        arg: itr => [{
          $: 'navigate',
          arg: `/userRpm/MibCounterRpm.htm`,
          frame: 'mainFrame',
          params: {
            refresh_enable: 0,
            refresh_frequency: 300,
            sel_port: `1/0/${itr.index + 1}`,
            selUnit: 1,
            _tid_: {
              $: 'eval',
              arg: 'top.g_tid'
            }
          },
          type: 'eval',
          values: {
            statistics: {
              rx: {
                broadcast: 'rx_value[0]',
                multicast: 'rx_value[1]',
                unicast: 'rx_value[2]',
                jumbo: 'rx_value[3]',
                alignment: 'rx_value[4]',
                undersized: 'rx_value[5]'
              },
              tx: {
                broadcast: 'tx_value[0]',
                multicast: 'tx_value[1]',
                unicast: 'tx_value[2]',
                jumbo: 'tx_value[3]',
                collisions: 'tx_value[4]'
              }
            }
          }
        }]
      }
    }
  }
};
