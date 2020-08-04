module.exports = {
  network: {
    lags: {
      types: {
        static: 2,
        active: 0
      },
      port: {
        $: 'fetch',
        arg: '/DS/Trunking.js',
        values: {
          $: 'fn',
          arg: async ctx => {
            const list = JSON.parse(await ctx.eval('eval', 'JSON.stringify(ds_TrunkList)'));
            const ports = {};
            for (let i = 0; i < list[0].length; i++) {
              if (list[0][i] == '1') {
                ports[i] = { type: 'static', group: 1 };
              }
              else if (list[1][i] == '1') {
                ports[i] = { type: 'static', group: 2 };
              }
              else {
                ports[i] = { type: 'none' };
              }
            }
            return ports;
          }
        }
      }
    }
  }
};
