module.exports = {
  network: {
    physical: {
      port: {
        $: 'navigate',
        arg: {
          $: 'eval',
          arg: `"/iss/specific/port_settings.html?Gambit=" + top.GAMBIT`
        },
        frame: 'maincontent',
        values: {
          $: 'iterate',
          arg: itr => [{
            id: `.portID:nth-child(${itr.index + 3}) .def:nth-child(2)`,
            name: `.portID:nth-child(${itr.index + 3}) .def:nth-child(3)`,
            status: {
              $: 'selector',
              arg: `.portID:nth-child(${itr.index + 3}) .def:nth-child(4)`,
              map: {
                'Up': 'up',
                'Down': 'down'
              }
            },
            framesize: `.portID:nth-child(${itr.index + 3}) .def:nth-child(8)`,
            type: {
              $: 'selector',
              arg: `.portID:nth-child(${itr.index + 3}) .def:nth-child(6)`,
              map: {
                '10M Full': '10M',
                '100M Full': '100M',
                '1000M Full': '1G',
                '10G Full': '10G',
                '10M Half': '10M',
                '100M Half': '100M',
                '1000M Half': '1G',
                '10G Half': '10G',
                'No Speed': '-'
              }
            },
            enable: {
              $: 'selector',
              arg: `.portID:nth-child(${itr.index + 3}) .def:nth-child(5)`,
              map: {
                'Auto': true,
                'Disable': false,
                '10M Half': true,
                '10M Full': true,
                '100M Half': true,
                '100M Full': true
              }
            },
            speed: {
              $: 'selector',
              arg: `.portID:nth-child(${itr.index + 3}) .def:nth-child(5)`,
              map: {
                'Auto': 'auto',
                'Disable': '-',
                '10M Half': '10M (H)',
                '10M Full': '10M',
                '100M Half': '100M (H)',
                '100M Full': '100M'
              }
            },
            flowcontrol: {
              $: 'selector',
              arg: `.portID:nth-child(${itr.index + 3}) .def:nth-child(7)`,
              map: {
                Disable: false,
                Enable: true
              }
            }
          }]
        }
      }
    }
  }
};
