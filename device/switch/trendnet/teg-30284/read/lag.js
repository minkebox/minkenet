module.exports = {
  network: {
    lags: {
      $: 'oid',
      arg: '1.3.6.1.4.1.28866.3.1.7.2.1.1',
      values: {
        $: 'fn',
        arg: ctx => {
          const map = { 1: 'active', 2: 'passive', 3: 'static', 4: 'none' };
          const nr = 8;
          const nrports = 28;
          const base = ctx.context[1][3][6][1][4][1][28866][3][1][7][2][1][1];
          const members = base[3];
          const mode = base[2];
          const ports = {};
          for (let j = 0; j < nrports; j++) {
            ports[j] = { type: 'none', group: 0 };
          }
          for (let i = 0; i < nr; i++) {
            const idx = i + nrports + 1;
            const type = map[mode[idx]] || 'none';
            if (type !== 'none') {
              const p = Buffer.from(members[idx], 'latin1')
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
