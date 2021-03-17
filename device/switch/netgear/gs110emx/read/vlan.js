module.exports = {
  network: {
    vlans: {
      '8021q': {
        $: 'navigate',
        arg: {
          $: 'eval',
          arg: `"/iss/specific/Cf8021q.html?Gambit=" + top.GAMBIT`
        },
        frame: 'maincontent',
        values: {
          $: 'selector',
          arg: `.detailsAreaContainer input[value=Enable]`
        }
      },
      vlan: {
        $: 'navigate',
        arg: {
          $: 'eval',
          arg: `"/iss/specific/vlanMembership.html?Gambit=" + top.GAMBIT`
        },
        frame: 'maincontent',
        values: {
          $: 'iterate',
          arg: itr => [{
            $: 'select+nav',
            arg: '#vlanIdOption',
            index: itr.index + 1
          }, {
            $1: {
              $: 'fn',
              arg: async ctx => {
                const port = {};
                for (let p = 0; p < 10; p++) {
                  if (await ctx.eval('selector', `.portMember:nth-child(${p + 2}) .tagImg`) !== null) {
                    port[p] = { tagged: true };
                  }
                  else if (await ctx.eval('selector', `.portMember:nth-child(${p + 2}) .untImg`) !== null) {
                    port[p] = { tagged: false };
                  }
                }
                return {
                  port: port
                };
              },
              $2: {
                name: {
                  $: 'local'
                }
              }
            }
          }]
        }
      },
      pvids: {
        $: 'navigate',
        arg: {
          $: 'eval',
          arg: `"/iss/specific/vlan_pvidsetting.html?Gambit=" + top.GAMBIT`
        },
        frame: 'maincontent',
        values: {
          $: 'iterate',
          arg: itr => [{
            pvid: `.portID:nth-child(${itr.index + 3}) td[sel=input]`
          }]
        }
      }
    }
  }
};
