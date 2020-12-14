module.exports = {
  network: {
    wireless: {
      radio: {
        0: {
          $: 'fetch',
          arg: '/data/wireless.basic.json',
          method: 'post',
          params: {
            operation: 'read',
            radioID: 0
          },
          values: {
            band: {
              $: 'literal',
              arg: '2_4ghz'
            },
            opmode: {
              $: 'literal',
              arg: 'ap'
            },
            mode: {
              $: null,
              arg: 'data.wirelessmode',
              map: {
                2: '11n',
                3: '11b/g',
                4: '11b/g/n',
              }
            },
            width: {
              $: null,
              arg: 'data.chwidth',
              map: {
                2: '20',
                3: '40',
                4: '20/40'
              }
            },
            txpower: {
              $: null,
              arg: 'data.txpower',
              map: {
                6: 6,
                7: 7,
                8: 8,
                9: 9,
                10: 10,
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
                23: 23,
                24: 24
              }
            }
          }
        },
        1: {
          $: 'fetch',
          arg: '/data/wireless.basic.json',
          method: 'post',
          params: {
            operation: 'read',
            radioID: 1
          },
          values: {
            band: {
              $: 'literal',
              arg: '5ghz'
            },
            opmode: {
              $: 'literal',
              arg: 'ap'
            },
            mode: {
              $: null,
              arg: 'data.wirelessmode',
              map: {
                8: '11ac',
                9: '11n/ac',
                10: '11a/n/ac'
              }
            },
            width: {
              $: null,
              arg: 'data.chwidth',
              map: {
                2: '20',
                3: '40',
                4: '20/40',
                5: '80',
                6: '20/40/80'
              }
            },
            txpower: {
              $: null,
              arg: 'data.txpower',
              map: {
                4: 4,
                5: 5,
                6: 6,
                7: 7,
                8: 8,
                9: 9,
                10: 10,
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
                22: 22
              }
            }
          }
        }
      }
    }
  }
};
