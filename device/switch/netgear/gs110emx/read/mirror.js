module.exports = {
  network: {
    mirror: {
      0: {
        $: 'navigate',
        arg: {
          $: 'eval',
          arg: `"/iss/specific/port_monitorconfig.html?Gambit=" + top.GAMBIT`
        },
        frame: 'maincontent',
        values: {
          enable: `input[value="0"]`,
          target: {
            $: 'fn',
            arg: async ctx => {
              for (let i = 0; i < 10; i++) {
                if (await ctx.eval({ $: 'selector', arg: `#tblDisplayDst .portMember:nth-child(${i + 2}) .checked` }) !== null) {
                  return i;
                }
              }
              return 0;
            }
          },
          port: {
            $: 'iterate',
            limit: 10,
            arg: itr => [{
              ingress: {
                $: 'selector',
                arg: `#tblDisplaySrc .portMember:nth-child(${itr.index + 2}) .checked`,
                map: v => true,
                fallback: false
              },
              egress: {
                $: 'selector',
                arg: `#tblDisplaySrc .portMember:nth-child(${itr.index + 2}) .checked`,
                map: v => true,
                fallback: false
              }
            }]
          }
        }
      }
    }
  }
};
