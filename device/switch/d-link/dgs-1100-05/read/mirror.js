module.exports = {
  network: {
    mirror: {
      0: {
        $: 'fetch',
        frame: 'mf0',
        arg: {
          $: 'eval',
          arg: `top.RT + 'DS/Mirror.js'`
        },
        type: 'eval',
        values: {
          enable: `!!ds_MirrorEn`,
          target: `ds_MirrTag - 1`,
          port: {
            $: 'fn',
            arg: async ctx => {
              const en = await ctx.eval({ $: 'eval', arg: 'ds_MirrorEn' });
              const src = await ctx.eval({ $: 'eval', arg: 'ds_MirrSrc '});
              const ports = {};
              const port = {};
              if (en === 1 || en === 3) {
                port.ingress = true;
              }
              if (en === 2 || en === 3) {
                port.egress = true;
              }
              for (let i = 0; i < src.length; i++) {
                if (src[i] === '1') {
                  ports[i] = port;
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
