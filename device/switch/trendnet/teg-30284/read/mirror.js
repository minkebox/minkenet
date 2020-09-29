const BASE = '1.3.6.1.4.1.28866.3.1.10';

module.exports = {
  network: {
    mirror: {
      0: {
        $: 'oid',
        arg: BASE,
        values: {
          enable: {
            $: 'jsonp',
            arg: `${BASE}.1.0`,
            map: {
              2: false,
              1: true
            }
          },
          target: {
            $: 'jsonp',
            arg: `${BASE}.2.0`,
            map: v => v - 1
          },
          port: {
            $: 'fn',
            arg: ctx => {
              const ports = {};
              const nrports = 28;
              const ingress = Buffer.from(ctx.context[1][3][6][1][4][1][28866][3][1][10][3][0], 'latin1');
              const egress = Buffer.from(ctx.context[1][3][6][1][4][1][28866][3][1][10][4][0], 'latin1');
              for (let j = 0; j < nrports; j++) {
                const val = {};
                if (ingress[Math.floor(j / 8)] & (0x80 >> (j % 8))) {
                  val.ingress = true;
                }
                if (egress[Math.floor(j / 8)] & (0x80 >> (j % 8))) {
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
}
