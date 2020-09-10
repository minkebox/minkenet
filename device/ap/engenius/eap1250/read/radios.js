module.exports = {
  network: {
    wireless: {
      $: 'navigate',
      arg: {
        $: 'eval',
        arg: `window.location.pathname.replace(/(tok=.*admin).*/,'$1')+'/network/wireless_device'`
      },
      values: {
        radio: {
          0: {
            band: {
              $: 'literal',
              arg: '2_4ghz'
            },
            opmode: '#cbid\\.wireless\\.wifi0\\.opmode',
            hwmode: '#cbid\\.wireless\\.wifi0\\.hwmode',
            htmode: {
              $: 'selector',
              arg: '#cbid\\.wireless\\.wifi0\\.htmode',
              map: {
                HT20: '20',
                HT40: '40',
                HT20_40: '20/40'
              }
            },
            txpower: {
              $: 'selector',
              arg: '#cbid\\.wireless\\.wifi0\\.txpower',
              map: {
                0: 'auto',
                11: 11,
                12: 12,
                13: 13,
                14: 14,
                15: 15,
                16: 16,
                17: 17,
                18: 18,
                19: 19,
                20: 20,
                21: 21,
                22: 22,
                23: 23
              }
            }
          },
          1: {
            band: {
              $: 'literal',
              arg: '5ghz'
            },
            opmode: '#cbid\\.wireless\\.wifi1\\.opmode',
            hwmode: '#cbid\\.wireless\\.wifi1\\.hwmode',
            htmode: {
              $: 'selector',
              arg: '#cbid\\.wireless\\.wifi1\\.htmode',
              map: {
                HT20: '20',
                HT40: '40',
                HT80: '80'
              }
            },
            txpower: {
              $: 'selector',
              arg: '#cbid\\.wireless\\.wifi1\\.txpower',
              map: {
                0: 'auto',
                11: 11,
                12: 12,
                13: 13,
                14: 14,
                15: 15,
                16: 16,
                17: 17,
                18: 18,
                19: 19,
                20: 20,
                21: 21,
                22: 22,
                23: 23
              }
            }
          }
        },
        station: {
          $: 'iterate',
          arg: itr => [{
            enable: {
              $: 'eval',
              arg: `!document.querySelector('input[name="cbid.wireless.wifix_ssid_${itr.index + 1}.ssid"]').disabled`
            },
            ssid: {
              $: 'selector',
              arg: `input[name="cbid.wireless.wifix_ssid_${itr.index + 1}.ssid"]`,
              map: v => v.indexOf('EnGenius') === 0 ? '' : v
            },
            bands: {
              $: 'fn',
              arg: async ctx => {
                const b0 = await ctx.eval({ $: 'selector', arg: `input[name="wireless.wifi0_ssid_${itr.index + 1}.disabled"]` });
                const b1 = await ctx.eval({ $: 'selector', arg: `input[name="wireless.wifi1_ssid_${itr.index + 1}.disabled"]` });
                const bands = [];
                if (b0) {
                  bands.push(0);
                }
                if (b1) {
                  bands.push(1);
                }
                return bands.join(',');
              }
            },
            security: {
              mode: {
                $: 'selector',
                arg: `#cbi-wireless-wifix_ssid_${itr.index + 1}-encryption_view`,
                map: {
                  'None': 'none',
                  'WPA2/PSK AES': 'wpa2/psk'
                }
              },
              encryption: {
                $: 'selector',
                arg: `#cbi-wireless-wifix_ssid_${itr.index + 1}-encryption_view`,
                map: {
                  'None': 'none',
                  'WPA2/PSK AES': 'aes'
                }
              }
            },
            vlan: {
              $: 'selector',
              arg: `div[name="cbid.wireless.wifix_ssid_${itr.index + 1}.vlan_id"]`,
              map: v => v == '-' ? 0 : v
            }
          }]
        }
      }
    }
  }
};
