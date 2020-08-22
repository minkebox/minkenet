module.exports = {
  network: {
    vlans: {
      ivl: {
        $: 'oid',
        arg: '1.3.6.1.4.1.28866.3.1.25.1.1.0',
        map: {
          2: false,
          1: true
        }
      },
      vlan: {
        $: 'oid',
        arg: '1.3.6.1.4.1.28866.3.1.25.3',
        values: {
          $: 'fn',
          arg: ctx => {
            const base = ctx.context[1][3][6][1][4][1][28866][3][1][25][3];
            const vid = base[1][1][1];
            const name = base[1][1][2];
            const egress = base[1][1][3];
            const untagged = base[1][1][4];
            const mgmt = base[2][1][2];
            const values = {};
            for (let k in vid) {
              const p = {};
              const ports = Buffer.from(egress[k], 'latin1');
              const unt = Buffer.from(untagged[k], 'latin1');
              let portnr = 0;
              for (let i = 0; i < 4; i++) {
                for (let j = 0x80; j; j = j >>> 1) {
                  if (ports[i] & j) {
                    p[portnr] = {
                      tagged: (unt[i] & j) ? false : true
                    };
                  }
                  portnr++;
                }
              }
              values[vid[k]] = {
                name: name[k],
                port: p,
                management: mgmt[k] === 1 ? true : false
              };
            }
            return values;
          }
        }
      },
      pvid: {
        $: 'oid',
        arg: '1.3.6.1.4.1.28866.3.1.25.3.3.1.2',
        values: {
          $: 'iterate',
          arg: itr => [{
            pvid: `1.3.6.1.4.1.28866.3.1.25.3.3.1.2.${itr.key + 1}`
          }]
        }
      }
    }
  }
};
