const Helpers = require('./_helpers');

module.exports = {
  network: {
    wireless: {
      $: 'fetch',
      arg: {
        $: 'fn',
        arg: async ctx => '/?code=2&asyn=0&id=' + encodeURIComponent(await ctx.eval('eval', 'jQuery.su.url.session'))
      },
      method: 'post',
      params: '32|1,0,0#32|2,0,0#33|1,1,0#33|1,2,0#33|1,3,0#33|2,1,0#33|2,2,0#33|2,3,0',
      transform: Helpers.convert,
      type: 'jsonp',
      values: {
        radio: {
          0: {
            band: { $: 'literal', arg: '2_4ghz' },
            opmode: {
              $: null,
              arg: 'bBridgeEnabled',
              map: {
                0: 'ap',
                1: 'ext'
              }
            },
            mode: {
              $: null,
              arg: 'uBgnMode',
              map: {
                1: '11b',
                2: '11g',
                3: '11b/g',
                4: '11n',
                5: '11b/g/n'
              }
            },
            width: {
              $: null,
              arg: 'uChannelWidth',
              map: {
                0: '20/40',
                1: '20',
                2: "40"
              }
            },
            //txpower: {},
          }
        },
        station: {
          0: {
            hidden: { $: null, arg: 'bBcastSsid', map: { 0: false, 1: true } },
            ssid: 'cSsid',
            bands: { $: 'literal', arg: '0' },
            isolate: {
              enable: { $: null, arg: 'bIsolationEnabled', map: { 0: false, 1: true } }
            },
            security: {
              mode: {
                $: 'fn',
                arg: async ctx => {
                  const bSecurityEnable = await ctx.eval('jsonp', 'bSecurityEnable');
                  if (!bSecurityEnable) {
                    return 0;
                  }
                  const uPSKSecOpt = await ctx.eval('jsonp', 'uPSKSecOpt');
                  const uPSKEncryptType = await ctx.eval('jsonp', 'uPSKEncryptType');
                  return 1;
                },
                map: {
                  0: 'none',
                  1: 'wpa/wpa2/psk + tkip/aes'
                }
              },
              passphrase: 'cPskSecret'
            }
          }
        }
      }
    }
  }
};
