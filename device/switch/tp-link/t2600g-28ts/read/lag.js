module.exports = {
  network: {
    lags: {
      $: 'navigate',
      arg: '/userRpm/TrunkViewRpm.htm',
      frame: 'mainFrame',
      type: 'eval',
      values: {
        $: 'fn',
        arg: async ctx => {
          info = JSON.parse(await ctx.eval('eval', 'JSON.stringify(info)'));
          const ports = {};
          for (let i = 0; i < 28; i++) {
            ports[i] = { type: 'none', group: 0 };
          }
          for (let i = 0; i < info.length; i++) {
            let type = 'none';
            switch (info[i][1]) {
              case 1:
                type = 'static';
                break;
              case 2:
                type = 'active';
                break;
              case 3:
                type = 'passive';
                break;
              default:
                break;
            }
            const group = info[i][0];
            info[i][2].split(',').forEach(s => {
              s = s.split('/')[2].split('-');
              const limit = parseInt(s[1] || s[0]);
              for (let j = parseInt(s[0]); j <= limit; j++) {
                ports[j - 1] = { type: type, group: group };
              }
            });
          }
          return {
            types: {
              static: 14,
              active: 14
            },
            port: ports
          }
        }
      }
    }
  }
};
