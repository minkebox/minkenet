module.exports = {
  network: {
    vlans: {
      $: 'guard',
      arg: {
        // Start on the correct page
        vlan$0: {
          $: 'navigate',
          arg: `/8021qCf.cgi`,
          frame: 'maincontent'
        },
        // Create vlans
        vlan$1: {
          $: `foreach`,
          options: { new: true, stable: false, deleted: false },
          arg: itr => [{
            $: `fetch`,
            arg: `/8021qCf.cgi`,
            method: `post`,
            frame: `maincontent`,
            params: {
              status: `Enable`, // This sets 802.1q mode
              ADD_VLANID: itr.key,
              hash: {
                $: `selector`,
                arg: `#hash`
              },
              ACTION: `Add`
            }
          }]
        },
        // Update memberships, but include any deleted vlans and ports as we need to keep these until we change the PVIDs
        // Updating membership is stateful - first select the page, then make changes and re-select the page.
        vlan$2: {
          $: `foreach`,
          options: { new: true, stable: true, deleted: true },
          arg: itr => [{
            $: 'guard',
            arg: {
              $0: {
                $: 'fetch',
                arg: `/8021qMembe.cgi`,
                method: `post`,
                frame: `maincontent`,
                params: {
                  VLAN_ID: itr.key,
                  hash: {
                    $: `selector`,
                    arg: `#hash`
                  },
                  hiddenMem: ''
                }
              },
              $1: {
                $: 'fetch',
                arg: `/8021qMembe.cgi`,
                method: `post`,
                frame: `maincontent`,
                params: {
                  VLAN_ID: itr.key,
                  hash: {
                    $: `selector`,
                    arg: `#hash`
                  },
                  hiddenMem: {
                    $: 'fn',
                    arg: async function() {
                      const oports = this.readKV(`${itr.path}.port`, { deleted: true, original: true });
                      const nports = this.readKV(`${itr.path}.port`) || {};
                      let mem = '';
                      for (let portnr = 0; portnr < 5; portnr++) {
                        if (!nports[portnr]) {
                          // Port not associated with this VLAN. But if it was, we keep the association a little longer
                          // so we can adjust the PVIDs. We then fix this up later.
                          if (!oports[portnr]) {
                            mem += '3';
                          }
                          else if (oports[portnr].tagged) {
                            mem += '2';
                          }
                          else {
                            mem += '1';
                          }
                        }
                        else if (nports[portnr].tagged) {
                          mem += '2';
                        }
                        else {
                          mem += '1';
                        }
                      }
                      return mem;
                    }
                  }
                }
              }
            }
          }]
        },
        // Update PVIDs
        pvid$3: {
          $: `foreach`,
          arg: itr => [{
            $: `guard`,
            arg: {
              $: `fetch`,
              arg: `/portPVID.cgi`,
              method: `post`,
              frame: `maincontent`,
              params: {
                pvid: {
                  $: `kv`,
                  arg: `${itr.path}.pvid`
                },
                hash: {
                  $: `selector`,
                  arg: `#hash`
                },
                [`port${itr.key}`]: 'checked'
              }
            }
          }]
        },
        // Update membership with the final version. This will remove any old vlans kept around until we changed the PVIDs
        vlan$4: {
          $: `foreach`,
          arg: itr => [{
            $: 'guard',
            arg: {
              $0: {
                $: 'fetch',
                arg: `/8021qMembe.cgi`,
                method: `post`,
                frame: `maincontent`,
                params: {
                  VLAN_ID: itr.key,
                  hash: {
                    $: `selector`,
                    arg: `#hash`
                  },
                  hiddenMem: ''
                }
              },
              $1: {
                $: 'fetch',
                arg: `/8021qMembe.cgi`,
                method: `post`,
                frame: `maincontent`,
                params: {
                  VLAN_ID: itr.key,
                  hash: {
                    $: `selector`,
                    arg: `#hash`
                  },
                  hiddenMem: {
                    $: 'fn',
                    arg: async function() {
                      const ports = this.readKV(`${itr.path}.port`);
                      let mem = '';
                      for (let portnr = 0; portnr < 5; portnr++) {
                        if (!ports[portnr]) {
                          mem += '3';
                        }
                        else if (ports[portnr].tagged) {
                          mem += '2';
                        }
                        else {
                          mem += '1';
                        }
                      }
                      return mem;
                    }
                  }
                }
              }
            }
          }]
        },
        // Remove deleted vlans
        vlan$5: {
          $: 'navigate',
          arg: `/8021qCf.cgi`,
          frame: 'maincontent'
        },
        vlan$6: {
          $: `foreach`,
          options: { new: false, stable: false, deleted: true },
          arg: itr => [{
            $: `fetch`,
            arg: `/8021qCf.cgi`,
            method: `post`,
            frame: `maincontent`,
            params: {
              status: `Enable`,
              ADD_VLANID: ``,
              vlanck1: itr.key,
              vlanNum: {
                $: `selector`,
                arg: `input[name=vlanNum]`
              },
              hash: {
                $: `selector`,
                arg: `#hash`
              },
              ACTION: `Delete`
            }
          }]
        }
      }
    }
  }
};
