module.exports = {
  network: {
    wireless: {
      station: {
        $: 'iterate',
        limit: 8,
        arg: itr => [{
          $: 'navigate',
          arg: {
            $: 'eval',
            arg: `window.location.pathname.replace(/(tok=.*admin).*/,'$1')+'/network/wifi_Encryption_Combined?wifi0_select_opmode=ap&wifi1_select_opmode=ap&displayMode=ap&checkbox2G=0&checkbox5G=0&netId=wifi0.network${itr.index + 1}'`
          },
          values: {
            hidden: `#cbid\\.wireless\\.wifi0_ssid_${itr.index + 1}\\.hidden1`,
            isolate: {
              enable: `#cbid\\.wireless\\.wifi0_ssid_${itr.index + 1}\\.isolate1`
            },
            steering: {
              enable: `#cbid\\.wireless\\.wifi0_ssid_${itr.index + 1}\\.bandsteer_en1`,
              preference: {
                $: 'selector',
                arg: `#select\\.bandsteer`,
                map: {
                  1: 'force',
                  2: 'prefer',
                  3: 'balance'
                }
              },
              minrssi: `[name="cbid\\.wireless\\.wifi0_ssid_${itr.index + 1}\\.bandsteerrssi"]`
            },
            security: {
              passphrase: `#cbid\\.wireless\\.wifi0_ssid_${itr.index + 1}\\.key`
            },
            fastroaming: {
              enable: `#cbid\\.wireless\\.wifi0_ssid_${itr.index + 1}\\.fastroamingEnable1`
            }
          }
        }]
      }
    }
  }
}
