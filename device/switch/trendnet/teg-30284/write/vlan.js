module.exports = {
  network: {
    vlans: {
      $: 'guard',
      arg: {
        vlan: {
          // Create all vlans
          $1: {
            $: 'foreach',
            arg: itr => [{
              $: 'fetch',
              arg: '/iss/specific/rpc.js',
              method: 'post',
              params: {
                Gambit: {
                  $: 'eval',
                  arg: 'GetInputGambit()'
                },
                RPC: {
                  $: 'tojson',
                  arg: {
                    method: 'BatchPost',
                    id: 0,
                    params: [{
                      dot1qVlanStaticVlanId: itr.key,
                      FuncName: 'CreateVlanAndWait'
                    }]
                  }
                }
              }
            }]
          },
          // Delete unused vlans
          $2: {
            $: 'foreach',
            options: { new: false, stable: false, deleted: true },
            arg: itr => [{
              $: 'fetch',
              arg: '/iss/specific/rpc.js',
              method: 'post',
              params: {
                Gambit: {
                  $: 'eval',
                  arg: 'GetInputGambit()'
                },
                RPC: {
                  $: 'tojson',
                  arg: {
                    method: 'BatchPost',
                    id: 0,
                    params: [{
                      dot1qVlanStaticVlanId: itr.key,
                      FuncName: 'TaggedVLAN_Del'
                    }]
                  }
                }
              }
            }]
          },
          // Update vlans
          $3: {
            $: 'foreach',
            arg: itr => [{
              $: 'fetch',
              arg: '/iss/specific/rpc.js',
              method: 'post',
              params: {
                Gambit: {
                  $: 'eval',
                  arg: 'GetInputGambit()'
                },
                RPC: {
                  $: 'tojson',
                  arg: {
                    method: 'BatchPost',
                    id: 0,
                    params: [{
                      dot1qVlanStaticVlanId: itr.key,
                      dot1qVlanStaticName: { $: 'kv', arg: `${itr.path}.name` },
                      dot1qVlanStaticEgressPorts: {
                        $: 'fn',
                        arg: () => {
                          const ports = itr.readKV(`${itr.path}.port`);
                          let mem = [ 0, 0, 0, 0, 0, 0, 0, 0 ];
                          for (let p in ports) {
                            if (ports[p].tagged === true || ports[p].tagged === false) {
                              mem[Math.floor(p / 4)] |= 8 >> (p % 4);
                            }
                          }
                          return mem.map(v => v.toString(16).toUpperCase()).join('') + '0000000000000000';
                        }
                      },
                      dot1qVlanStaticUntaggedPorts: {
                        $: 'fn',
                        arg: () => {
                          const ports = itr.readKV(`${itr.path}.port`);
                          let mem = [ 0, 0, 0, 0, 0, 0, 0, 0 ];
                          for (let p in ports) {
                            if (ports[p].tagged === false) {
                              mem[Math.floor(p / 4)] |= 8 >> (p % 4);
                            }
                          }
                          return mem.map(v => v.toString(16).toUpperCase()).join('') + '0000000000000000';
                        }
                      },
                      dot1qMgmtVlanStatus: {
                        $: 'fn',
                        arg: () => {
                          const vlans = ctx.readKV(ctx.path);
                          for (let p in vlans) {
                            if (vlans[p].management === true) {
                              return '0'
                            }
                          }
                          return '1';
                        }
                      },
                      FuncName: 'TaggedVLAN_Mod'
                    }]
                  }
                }
              }
            }]
          },
          // Update PVIDs
          $4: {
            $: 'foreach',
            arg: itr => [{
              $: 'guard',
              arg: {
                $: 'fetch',
                arg: '/iss/specific/rpc.js',
                method: 'post',
                params: {
                  Gambit: {
                    $: 'eval',
                    arg: 'GetInputGambit()'
                  },
                  RPC: {
                    $: 'tojson',
                    arg: {
                      method: 'BatchPost',
                      id: 0,
                      params: [{
                        dot1qPvid: {
                          $: 'kv',
                          arg: `${itr.path}.pvid`
                        },
                        dot1qPortAcceptableFrameTypes: '1',
                        dot1qPortIngressFiltering: '1',
                        dot1qPortIndex: itr.key,
                        FuncName: 'TaggedVLAN_PVID'
                      }]
                    }
                  }
                }
              }
            }]
          }
        }
      }
    }
  }
};
