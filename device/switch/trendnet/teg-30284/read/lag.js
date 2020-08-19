function c(str) {
  return str.split(':').slice(0, 4).map(v => parseInt(v, 16))
}

module.exports = {
  network: {
    lags: {
      $: 'fetch',
      frame: 'myframe',
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
            method: 'CommonGet',
            id: 0,
            params: {
              Template: 'laPortChannelEntry'
            }
          }
        }
      },
      type: 'jsonp',
      values: {
        $: 'fn',
        arg: async ctx => {
          const nrports = 28;
          const result = await ctx.eval('jsonp', 'result');
          const nr = result.length;
          const ports = {};
          for (let j = 0; j < nrports; j++) {
            ports[j] = { type: 'none', group: 0 };
          }
          for (let i = 0; i < nr; i++) {
            const p = c(result[i].laPortChannelMemberList);
            let type = null;
            switch (result[i].laPortChannelMode) {
              case '1':
                type = 'active';
                break;
              case '2':
                type = 'passive';
                break;
              case '3':
                type = 'static';
                break;
              default:
                type = 'none';
                break;
            }
            if (type !== 'none') {
              for (let j = 0; j < nrports; j++) {
                if (p[Math.floor(j / 8)] & (0x80 >> (j % 8))) {
                  ports[j] = { type: type, group: i + 1 };
                }
              }
            }
          }
          return {
            types: {
              static: nr,
              active: nr
            },
            port: ports
          };
        }
      }
    }
  }
};
