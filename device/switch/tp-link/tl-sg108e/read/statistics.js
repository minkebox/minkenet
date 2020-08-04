module.exports = {
  network: {
    physical: {
      port: {
        $: 'navigate',
        arg: '/PortStatisticsRpm.htm',
        frame: 'mainFrame',
        values: {
          $: 'iterate',
          arg: itr => [{
            statistics: {
              rx: {
                packets: `form[name=port_statistics] tr:nth-child(${itr.index + 2}) td:nth-child(6)`,
                errors: `form[name=port_statistics] tr:nth-child(${itr.index + 2}) td:nth-child(7)`
              },
              tx: {
                packets: `form[name=port_statistics] tr:nth-child(${itr.index + 2}) td:nth-child(4)`,
                errors: `form[name=port_statistics] tr:nth-child(${itr.index + 2}) td:nth-child(5)`
              }
            }
          }]
        }
      }
    }
  }
};
