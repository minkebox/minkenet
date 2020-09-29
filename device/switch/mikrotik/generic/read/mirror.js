module.exports = {
  network: {
    mirror: {
      0: {
        $: 'fetch',
        arg: '/fwd.b',
        type: 'eval+r',
        values: {
          enable: { $: 'literal', arg: true },
          target: '$R.mrto - 1',
          port: {
            $: 'fn',
            arg: async ctx => {
              const ports = {};
              const nrports = ctx.readKV('network.physical.ports.nr.total');
              const im = await ctx.eval({ $: 'eval', arg: '$R.imr '});
              const om = await ctx.eval({ $: 'eval', arg: '$R.omr '});
              for (let j = 0; j < nrports; j++) {
                const val = {};
                if (!!(im & (1 << j))) {
                  val.ingress = true;
                }
                if (!!(om & (1 << j))) {
                  val.egress = true;
                }
                for (const k in val) {
                  ports[j] = val;
                  break;
                }
              }
              return ports;
            }
          }
        }
      }
    }
  }
};
