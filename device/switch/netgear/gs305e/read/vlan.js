module.exports = {
  network: {
    vlans: {
      '8021q': {
        $: 'navigate',
        arg: '/8021qCf.cgi',
        frame: 'maincontent',
        values: {
          $: 'selector',
          arg: 'form[action="8021qCf.cgi"] input[value=Enable]'
        }
      },
      vlan: {
        $: 'navigate',
        arg: '/8021qMembe.cgi',
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
              arg: async function() {
                const port = {};
                for (let p = 0; p < 5; p++) {
                  try {
                    await this.eval('selector', `.portMember:nth-child(${p + 2}) .tagImg`);
                    port[p] = { tagged: true };
                  }
                  catch (_) {
                    try {
                      await this.eval('selector', `.portMember:nth-child(${p + 2}) .untImg`);
                      port[p] = { tagged: false };
                    }
                    catch (_) {
                    }
                  }
                }
                return {
                  port: port
                };
              }
            },
            $2: {
              name: {
                $: 'local'
              }
            }
          }]
        }
      },
      pvid: {
        $: 'navigate',
        arg: '/portPVID.cgi',
        frame: 'maincontent',
        values: {
          $: 'iterate',
          limit: 5,
          arg: itr => [{
            pvid: `.portID:nth-child(${itr.index + 3}) td[sel=input]`
          }]
        }
      }
    }
  }
};
