module.exports = {
  network: {
    physical: {
      port: {
        0: {
          statistics: {
            $: 'oid',
            arg: '1.3.6.1.2.1.2.2.1',
            values: {
              $: 'fn',
              arg: ctx => {
                const base = ctx.context[1][3][6][1][2][1][2][2][1];
                const names = OID.getKeyValues('', base[2]);
                const idx = Object.keys(names)[Object.values(names).findIndex(v => v === 'eth1')];
                if (idx) {
                  return {
                    rx: {
                      bytes: base[10][idx],
                      unicast: base[11][idx],
                      multicast: base[12][idx],
                      discareded: base[13][idx],
                      errors: base[14][idx],
                      unknownprotos: base[15][idx]
                    },
                    tx: {
                      bytes: base[16][idx],
                      unicast: base[17][idx],
                      multicast: base[18][idx],
                      discareded: base[19][idx],
                      errors: base[20][idx],
                    }
                  };
                }
                return null;
              }
            }
          }
        }
      }
    }
  }
};
