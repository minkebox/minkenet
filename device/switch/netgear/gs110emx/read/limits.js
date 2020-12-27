const Mbits = (v) => v / 8 * 1024 * 1024;

module.exports = {
  network: {
    physical: {
      port: {
        $: 'navigate',
        arg: {
          $: 'eval',
          arg: `"/iss/specific/port_ratectrl.html?Gambit=" + top.GAMBIT`
        },
        frame: 'maincontent',
        values: {
          $: 'iterate',
          arg: itr => [{
            limit: {
              ingress: {
                $: null,
                arg: `.portID:nth-child(${itr.index + 3}) input[name=IN_RATE_LIMIT]`,
                map: {
                  0: 0,
                  1: 0,
                  2: Mbits(1),
                  3: Mbits(5),
                  4: Mbits(10),
                  5: Mbits(50),
                  6: Mbits(100),
                  7: Mbits(500),
                }
              },
              egress: {
                $: null,
                arg: `.portID:nth-child(${itr.index + 3}) input[name=RATE_LIMIT]`,
                map: {
                  0: 0,
                  1: 0,
                  2: Mbits(1),
                  3: Mbits(5),
                  4: Mbits(10),
                  5: Mbits(50),
                  6: Mbits(100),
                  7: Mbits(500),
                }
              }
            }
          }]
        }
      }
    }
  }
};
