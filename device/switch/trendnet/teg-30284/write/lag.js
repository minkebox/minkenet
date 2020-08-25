module.exports = {
  network: {
    lags: {
      $: 'guard',
      arg: {
        $: 'fn',
        arg: async ctx => {
          const groups = {
            0: { type: 4, ports: [ 0, 0, 0, 0, 0, 0, 0, 0 ]},
            1: { type: 4, ports: [ 0, 0, 0, 0, 0, 0, 0, 0 ]},
            2: { type: 4, ports: [ 0, 0, 0, 0, 0, 0, 0, 0 ]},
            3: { type: 4, ports: [ 0, 0, 0, 0, 0, 0, 0, 0 ]},
            4: { type: 4, ports: [ 0, 0, 0, 0, 0, 0, 0, 0 ]},
            5: { type: 4, ports: [ 0, 0, 0, 0, 0, 0, 0, 0 ]},
            6: { type: 4, ports: [ 0, 0, 0, 0, 0, 0, 0, 0 ]},
            7: { type: 4, ports: [ 0, 0, 0, 0, 0, 0, 0, 0 ]}
          };
          const ports = ctx.readKV(`${ctx.path}.port`);
          for (let p in ports) {
            switch (ports[p].type) {
              case 'static':
                groups[ports[p].group].ports[Math.floor(p / 4)] |= 8 >> (p % 4);
                groups[ports[p].group].type = 3;
                break;
              case 'active':
                groups[ports[p].group].ports[Math.floor(p / 4)] |= 8 >> (p % 4);
                groups[ports[p].group].type = 1;
                break;
              case 'passive':
                groups[ports[p].group].ports[Math.floor(p / 4)] |= 8 >> (p % 4);
                groups[ports[p].group].type = 2;
                break;
              case 'none':
              default:
                groups[ports[p].group].type = 4;
                break;
            }
          }
          for (let i in groups) {
            await ctx.eval({ $: 'oid+set', arg: `1.3.6.1.4.1.28866.3.1.7.2.1.1.2.${i + 29}`, value: groups[i].type });
            await ctx.eval({ $: 'oid+set', arg: `1.3.6.1.4.1.28866.3.1.7.2.1.1.3.${i + 29}`, value: Buffer.from(groups[i].ports) });
          }
        }
      }
    }
  }
};
