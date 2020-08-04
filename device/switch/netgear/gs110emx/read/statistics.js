module.exports = {
  network: {
    physical: {
      port: {
        $: 'navigate',
        arg: {
          $: 'eval',
          arg: `"/iss/specific/interface_stats.html?Gambit=" + top.GAMBIT`
        },
        frame: 'maincontent',
        values: {
          $: 'iterate',
          arg: itr => [{
            statistics: {
              rx: {
                bytes: `.portID:nth-child(${itr.index + 2}) .def:nth-child(2)`,
                errors: `.portID:nth-child(${itr.index + 2}) .def:nth-child(4)`,
                crc: `.portID:nth-child(${itr.index + 2}) .def:nth-child(4)`
              },
              tx: {
                bytes: `.portID:nth-child(${itr.index + 2}) .def:nth-child(3)`
              }
            }
          }]
        }
      }
    }
  }
};
