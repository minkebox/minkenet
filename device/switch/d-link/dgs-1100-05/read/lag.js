module.exports = {
  network: {
    lags: {
      types: {
        static: 1,
        active: 0
      },
      port: {
        $: 'fetch',
        frame: 'mf0',
        arg: {
          $: 'eval',
          arg: `top.RT + 'DS/trunking.js'`
        },
        type: 'eval',
        values: {
          $: 'eval',
          arg: 'ds_TrunkList[0]',
          map: ports => {
            const r = {};
            for (let i = 0; i < ports.length; i++) {
              if (ports[i] == '1') {
                r[i] = { type: 'static', group: 1 };
              }
              else {
                r[i] = { type: 'none' };
              }
            }
            return r;
          }
        }
      }
    }
  }
};
