module.exports = {
  network: {
    physical: {
      port: {
        $: 'navigate',
        arg: '/portStatistics.cgi',
        frame: 'maincontent',
        values: {
          $: 'iterate',
          limit: 5,
          arg: itr => [
            {
              statistics: {
                rx: {
                  bytes: `.portID:nth-child(${itr.index + 3}) .def:nth-child(2)`,
                  errors: `.portID:nth-child(${itr.index + 3}) .def:nth-child(8)`,
                  crc: `.portID:nth-child(${itr.index + 3}) .def:nth-child(8)`
                },
                tx: {
                  bytes: `.portID:nth-child(${itr.index + 3}) .def:nth-child(5)`
                }
              }
            }
          ]
        }
      }
    }
  }
};
