module.exports = {
  network: {
    lags: {
      $: 'guard',
      arg: {
        $: 'fn',
        arg: async ctx => {
          const groups = {
            0: { type: 'none', ports: [ 0, 0, 0, 0, 0, 0, 0, 0 ]},
            1: { type: 'none', ports: [ 0, 0, 0, 0, 0, 0, 0, 0 ]},
            2: { type: 'none', ports: [ 0, 0, 0, 0, 0, 0, 0, 0 ]},
            3: { type: 'none', ports: [ 0, 0, 0, 0, 0, 0, 0, 0 ]},
            4: { type: 'none', ports: [ 0, 0, 0, 0, 0, 0, 0, 0 ]},
            5: { type: 'none', ports: [ 0, 0, 0, 0, 0, 0, 0, 0 ]},
            6: { type: 'none', ports: [ 0, 0, 0, 0, 0, 0, 0, 0 ]},
            7: { type: 'none', ports: [ 0, 0, 0, 0, 0, 0, 0, 0 ]}
          };
          const ports = ctx.readKV(`${ctx.path}.port`);
          for (let p in ports) {
            switch (ports[p].type) {
              case 'static':
              case 'active':
              case 'passive':
                groups[ports[p].group].ports[Math.floor(p / 4)] |= 8 >> (p % 4);
                groups[ports[p].group].type = ports[p].type;
                break;
              case 'none':
              default:
                break;
            }
          }
          for (let gid in groups) {
            const group = groups[gid];
            const ports = group.ports.map(v => v.toString(16).toUpperCase()).join('');
            let type = 4;
            switch (group.type) {
              case 'active':
                type = 1;
                break;
              case 'passive':
                type = 2;
                break;
              case 'static':
                type = 3;
                break;
              default:
                break;
            }
            if (type === 4 || ports === '00000000') {
              await ctx.eval({
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
                        laPortChannelIfIndex: `${29 + parseInt(gid)}`,
                        laPortChannelMode: `4`,
                      }]
                    }
                  }
                }
              });
            }
            else {
              await ctx.eval({
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
                        laPortChannelIfIndex: `${29 + parseInt(gid)}`,
                        laPortChannelMode: `${type}`,
                        laPortChannelMemberList: ports
                      }]
                    }
                  }
                }
              });
            }
          }
        }
      }
    }
  }
};
