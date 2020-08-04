module.exports = {
  network: {
    vlans: {
      $: 'guard',
      arg: {
        '8021q': {
          $: 'guard',
          arg: {
            $: 'fetch',
            arg: '/cgi/Asy_vlan.cgi',
            method: 'post',
            params: {
              AsyVEn: {
                $: 'kv',
                map: {
                  true: 0,
                  false: 1
                }
              }
            }
          }
        },
        vlan$1: {
          $: 'foreach',
          arg: itr => [{
            $: 'fetch',
            arg: '/cgi/q_vlan_add_edit.cgi',
            method: 'post',
            params: {
              VID: itr.key,
              VName: { $: 'kv', arg: `${itr.path}.name` },
              mem: {
                $: 'fn',
                arg: async () => {
                  const ports = await itr.readKV(`${itr.path}.port`);
                  let mem = '';
                  for (let p in ports) {
                    if (ports[p].tagged === true) {
                      mem += 'T';
                    }
                    else if (ports[p].tagged === false) {
                      mem += 'U';
                    }
                    else {
                      mem += '0';
                    }
                  }
                  return mem;
                }
              }
            }
          }]
        },
        vlan$2: {
          $: 'fetch',
          arg: '/cgi/mgt_vlan.cgi',
          method: 'post',
          params: {
            $: 'fn',
            arg: async ctx => {
              const vlans = ctx.readKV(`${ctx.path}`);
              for (let p in vlans) {
                if (vlans[p].management === true) {
                  return {
                    mgtEn: 1,
                    mgtVid: p
                  };
                }
              }
              return {
                mgtEn: 0
              };
            }
          }
        },
        vlan$3: {
          $: 'foreach',
          options: { deleted: true },
          arg: itr => [{
            $: 'fetch',
            arg: '/cgi/q_vlan_del.cgi',
            method: 'post',
            params: {
              tag_id: `${itr.key}`
            }
          }]
        },
        pvid: {
          $: 'fetch',
          arg: '/cgi/q_vlan_set_pvid.cgi',
          method: 'post',
          params: {
            $: 'fn',
            arg: async ctx => {
              const ports = ctx.readKV(`${ctx.path}`);
              const pvid = [];
              for (let p in ports) {
                pvid.push(`Pvid=${ports[p].pvid}`);
              }
              return pvid.join('&');
            }
          }
        }
      }
    }
  }
}
