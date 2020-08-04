module.exports = {
  network: {
    lags: {
      $: 'navigate',
      arg: '/PortTrunkRpm.htm',
      frame: 'mainFrame',
      values: {
        $: 'fn',
        arg: async ctx => {
          const p = [];
          const nr = await ctx.eval('eval', 'trunk_conf.maxTrunkNum');
          const nrports = await ctx.eval('eval', 'trunk_conf.portNum');
          for (let i = 0; i < nr; i++) {
            p[i] = await ctx.eval('eval', `trunk_conf.portStr_g${i + 1}`);
          }
          const ports = {};
          for (let i = 0; i < nrports; i++) {
            ports[i] = { type: 'none', group: 0 };
            for (let j = 0; j < nr; j++) {
              if (p[j][i]) {
                ports[i] = { type: 'static', group: j + 1 };
                break;
              }
            }
          }
          return {
            types: {
              static: nr,
              active: 0
            },
            port: ports
          };
        }
      }
    }
  }
};
