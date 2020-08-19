module.exports = {
  network: {
    physical: {
      port: {
        $: 'fetch',
        frame: 'myframe',
        arg: '/iss/specific/rpc.js',
        method: 'post',
        params: {
          Gambit: {
            $: 'eval',
            arg: 'GetInputGambit()'
          },
          RPC: {
            $: 'tojson',
            arg: {
              method: 'CommonGet',
              id: 0,
              params: {
                Template: 'statisticsChartEntry'
              }
            }
          }
        },
        type: 'jsonp',
        values: {
          $: 'iterate',
          arg: itr => [{
            statistics: {
              rx: {
                bytes: `result[${itr.index}].statisInOctets`,
                unicast: `result[${itr.index}].statisInUcastPkts`,
                multicast: `result[${itr.index}].statisInNUcastPkts`,
                discarded: `result[${itr.index}].statisInDiscards`,
                errors: `result[${itr.index}].statisInErrors`,
                undersized: `result[${itr.index}].statisEtherUndersizePkts`,
                oversized: `result[${itr.index}].statisEtherOversizePkts`,
                crc: `result[${itr.index}].statisEtherCRCAlignErrors`,
                collisions: `result[${itr.index}].statisEtherCollisions`,
                drop: `result[${itr.index}].statisEtherDropEvents`,
                fragments: `result[${itr.index}].statisEtherFragments`
              },
              tx: {
                bytes: `result[${itr.index}].statisOutOctets`,
                unicast: `result[${itr.index}].statisOutUcastPkts`,
                multicast: `result[${itr.index}].statisOutNUcastPkts`,
                discarded: `result[${itr.index}].statisOutDiscards`,
                errors: `result[${itr.index}].statisOutErrors`,
              }
            }
          }]
        }
      }
    }
  }
};
