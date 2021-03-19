module.exports = {
  network: {
    vlans: {
      $: 'guard',
      arg: {
        // Create new vlans
        vlan$1: {
          $: 'foreach',
          options: { new: true, stable: false, deleted: false },
          arg: itr => [{
            $: 'fetch',
            arg: '/iss/specific/Cf8021q.html',
            method: 'post',
            params: {
              Gambit: {
                $: 'eval',
                arg: 'top.GAMBIT'
              },
              status: 'Enable',
              ADD_VLANID: `${itr.key}`,
              selectedVLANs: '',
              ACTION: 'Add'
            }
          }]
        },
        // Update memberships, but include any deleted vlans and ports as we need to keep these until we change the PVIDs
        vlan$2: {
          $: 'foreach',
          options: { new: true, stable: true, deleted: true },
          arg: itr => [{
            $: 'guard',
            arg: {
              $: 'fetch',
              arg: '/iss/specific/vlanMembership.html',
              method: 'post',
              params: {
                Gambit: {
                  $: 'eval',
                  arg: 'top.GAMBIT'
                },
                VLAN_ID: `${itr.key}`,
                vlanIdSel: `${itr.key}`,
                hiddenMem: {
                  $: 'fn',
                  arg: async function() {
                    const v = '3333333333';
                    for (let i = 0; i < 10; i++) {
                      const ports = this.readKV(`${itr.path}.port`);
                      for (let p in ports) {
                        v[parseInt(p)] = ports[p].tagged ? '2' : '1';
                      }
                    }
                    return v;
                  }
                },
                ACTION: ''
              }
            }
          }]
        },
        // Update pvids
        pvid$3: {
          $: 'foreach',
          arg: itr => [{
            $: 'guard',
            arg: {
              $: 'fetch',
              arg: '/iss/specific/vlan_pvidsetting.html',
              method: 'post',
              params: {
                Gambit: {
                  $: 'eval',
                  arg: 'top.GAMBIT'
                },
                PORT_NO: `${itr.index + 1};`,
                PORT_PVID: {
                  $: 'kv',
                  arg: `${itr.path}.pvid`
                },
                ACTION: 'Apply'
              }
            }
          }]
        },
        // Update memberships again now PVIDs are updated
        vlan$3: {
          $: 'foreach',
          arg: itr => [{
            $: 'guard',
            arg: {
              $: 'fetch',
              arg: '/iss/specific/vlanMembership.html',
              method: 'post',
              params: {
                Gambit: {
                  $: 'eval',
                  arg: 'top.GAMBIT'
                },
                VLAN_ID: `${itr.key}`,
                vlanIdSel: `${itr.key}`,
                hiddenMem: {
                  $: 'fn',
                  arg: async function() {
                    const v = '3333333333';
                    for (let i = 0; i < 10; i++) {
                      const ports = this.readKV(`${itr.path}.port`);
                      for (let p in ports) {
                        v[parseInt(p)] = ports[p].tagged ? '2' : '1';
                      }
                    }
                    return v;
                  }
                },
                ACTION: ''
              }
            }
          }]
        },
        // Delete vlans
        vlan$4: {
          $: 'foreach',
          options: { new: false, stable: false, deleted: true },
          arg: itr => [{
            $: 'fetch',
            arg: '/iss/specific/Cf8021q.html',
            method: 'post',
            params: {
              Gambit: {
                $: 'eval',
                arg: 'top.GAMBIT'
              },
              status: 'Enable',
              ADD_VLANID: ``,
              checkbox: ``,
              selectedVLANs: `${itr.key}`,
              ACTION: 'Delete'
            }
          }]
        }
      }
    }
  }
};
