const BASE = '1.3.6.1.4.1.28866.3.1.10';

module.exports = {
  network: {
    mirror: {
      0: {
        $: 'guard',
        arg: {
          enable: {
            $: 'oid+set',
            arg: `${BASE}.1.0`,
            map: {
              true: 1,
              false: 2
            }
          },
          $1: {
            $: 'guard',
            key: { $: 'kv', arg: 'network.mirror.0.enable' },
            arg: {
              target: {
                $: 'oid+set',
                arg: `${BASE}.2.0`,
                map: v => v + 1
              },
              port: {
                $: 'fn',
                arg: async ctx => {
                  const ports = ctx.readKV(ctx.path);
                  const ingress = [ 0, 0, 0, 0 ];
                  const egress = [ 0, 0, 0, 0 ];
                  for (let p in ports) {
                    if (ports[p].ingress) {
                      ingress[Math.floor(p / 8)] |= 0x80 >> (p % 8);
                    }
                    if (ports[p].egress) {
                      egress[Math.floor(p / 8)] |= 0x80 >> (p % 8);
                    }
                  }
                  await ctx.eval({ $: 'oid+set', arg: `${BASE}.3.0`, value: Buffer.from(ingress) });
                  await ctx.eval({ $: 'oid+set', arg: `${BASE}.4.0`, value: Buffer.from(egress) });
                }
              }
            }
          }
        }
      }
    }
  }
}
