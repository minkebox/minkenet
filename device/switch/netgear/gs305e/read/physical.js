module.exports = {
  network: {
    physical: {
      $: 'navigate',
      arg: '/status.cgi',
      frame: 'maincontent',
      values: {
        port: {
          $: 'iterate',
          limit: 5,
          arg: itr => [{
            id: `.portID:nth-child(${itr.index + 3}) .def:nth-child(2)`,
            status: {
              $: 'selector',
              arg: `.portID:nth-child(${itr.index + 3}) .def:nth-child(3)`,
              map: {
                Up: 'up',
                Down: 'down'
              }
            },
            framesize:`.portID:nth-child(${itr.index + 3}) .def:nth-child(7)`,
            type: {
              $: 'selector',
              arg: `.portID:nth-child(${itr.index + 3}) .def:nth-child(5)`,
              map: {
                'No Speed': '-',
                '10M': '10M',
                '100M': '100M',
                '1000M': '1G'
              }
            },
            flowcontrol: {
              $: 'selector',
              arg: `.portID:nth-child(${itr.index + 3}) .def:nth-child(6)`,
              map: {
                Disable: false,
                Enable: true
              }
            },
            speed: {
              $: 'selector',
              arg: `.portID:nth-child(${itr.index + 3}) .def:nth-child(4)`,
              map: {
                'Auto': 'auto',
                'Disable': 'auto',
                '10M Half': '10M (H)',
                '10M Full': '10M',
                '100M Half': '100M (H)',
                '100M Full': '100M'
              }
            },
            enable: {
              $: 'selector',
              arg: `.portID:nth-child(${itr.index + 3}) .def:nth-child(4)`,
              map: {
                'Auto': true,
                'Disable': false,
                '10M Half': true,
                '10M Full': true,
                '100M Half': true,
                '100M Full': true
              }
            }
          }]
        }
      }
    }
  }
};
