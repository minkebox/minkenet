module.exports = {
  network: {
    lags: {
      $: 'oid',
      arg: '1.3.6.1.4.1.28866.3.1.7.2.1.1',
      values: {
        $: 'fn',
        arg: ctx => {
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
            const idx = nrports + 1 + i;
            let type = null;
            switch (mode[idx]) {
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
