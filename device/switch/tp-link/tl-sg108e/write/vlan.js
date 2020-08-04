module.exports = {
  network: {
    //
    // VLAN configuration
    //
    vlans: {
      $: 'guard',
      arg: {
        '8021q': {
          $: 'guard',
          arg: {
            $: 'fetch',
            arg: '/qvlanSet.cgi',
            params: {
              qvlan_en: {
                $: 'kv',
                map: {
                  true: 1,
                  false: 0
                }
              },
              qvlan_mode: 'Apply'
            }
          }
        },
        vlan: {
          // Create all the vlans.
          $1: {
            $: 'foreach',
            arg: itr => [{
              $: 'guard',
              arg: {
                $: 'fetch',
                arg: '/qvlanSet.cgi',
                params: {
                  vid: itr.key,
                  vname: { $: 'kv', arg: `${itr.path}.name` },
                  selType_1: { $: 'kv', arg: `${itr.path}.port.0.tagged`, map: { false: 0, true: 1, undefined: 2  }},
                  selType_2: { $: 'kv', arg: `${itr.path}.port.1.tagged`, map: { false: 0, true: 1, undefined: 2  }},
                  selType_3: { $: 'kv', arg: `${itr.path}.port.2.tagged`, map: { false: 0, true: 1, undefined: 2  }},
                  selType_4: { $: 'kv', arg: `${itr.path}.port.3.tagged`, map: { false: 0, true: 1, undefined: 2  }},
                  selType_5: { $: 'kv', arg: `${itr.path}.port.4.tagged`, map: { false: 0, true: 1, undefined: 2  }},
                  selType_6: { $: 'kv', arg: `${itr.path}.port.5.tagged`, map: { false: 0, true: 1, undefined: 2  }},
                  selType_7: { $: 'kv', arg: `${itr.path}.port.6.tagged`, map: { false: 0, true: 1, undefined: 2  }},
                  selType_8: { $: 'kv', arg: `${itr.path}.port.7.tagged`, map: { false: 0, true: 1, undefined: 2  }},
                  qvlan_add: 'Add/Modify'
                }
              }
            }]
          },
          // Delete any unused ones
          $2: {
            $: 'foreach',
            options: { new: false, stable: false, deleted: true },
            arg: itr => [{
              $: 'fetch',
              arg: '/qvlanSet.cgi',
              params: {
                selVlans: itr.key,
                qvlan_del: 'Delete'
              }
            }]
          }
        },
        pvid: {
          // Adjust all the PVIDs
          $: 'foreach',
          arg: itr => [{
            $: 'guard',
            arg: {
              $: `fetch`,
              arg: `/vlanPvidSet.cgi`,
              params: {
                pvid: {
                  $: 'kv',
                  arg: `${itr.path}.pvid`
                },
                pbm: {
                  $: `eval`,
                  arg: `1 << ${itr.key}`
                }
              }
            }
          }]
        }
      }
    }
  }
};
