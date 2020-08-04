module.exports = {
  network: {
    vlans: {
      $: 'fetch',
      frame: 'mf0',
      arg: {
        $: 'eval',
        arg: `top.RT + 'DS/QVLAN.js'`
      },
      type: 'eval',
      values: {
        '8021q': '!!ds_QVEnable',
        ivl: '!ds_AsyVlanEn',
        vlan: {
          $: 'iterate',
          arg: itr => [
            `ds_QVLANList[${itr.index}][0]`,
            {
              name: `ds_QVLANList[${itr.index}][1]`,
              management: `ds_QVLANList[${itr.index}][1] == ds_MgtVID`,
              port: {
                $: 'eval',
                arg: `ds_QVLANList[${itr.index}][2]`,
                map: ports => {
                  const r = {};
                  for (let p = 0; p < ports.length; p++) {
                    switch (ports[p]) {
                      case 'U':
                        r[p] = { tagged: false };
                        break;
                      case 'T':
                        r[p] = { tagged: true };
                        break;
                      case '0':
                      default:
                        break;
                    }
                  }
                  return r;
                }
              }
            }
          ]
        },
        pvid: {
          $: 'iterate',
          arg: itr => [{
            pvid: `ds_PVID[${itr.index}]`
          }]
        }
      }
    }
  }
};
