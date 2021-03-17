module.exports = {
  network: {
    clients: {
      $: 'oid',
      arg: '1.3.6.1.4.1.28866.3.1.5.2.1.1',
      values: {
        $: 'fn',
        arg: ctx => {
          const base = ctx.context[1][3][6][1][4][1][28866][3][1][5][2][1][1];
          function f(v) {
            const l = [];
            function _f(v) {
              if (typeof v === 'object') {
                for (let k in v) {
                  _f(v[k]);
                }
              }
              else {
                l.push(v);
              }
            }
            _f(v);
            return l;
          }
          const vlans = f(base[1]);
          const macs = f(base[2]);
          const ports = f(base[3]);
          const values = {};
          for (let k in macs) {
            values[k] = {
              mac: OID.toMacAddress(macs[k]),
              vlan: vlans[k],
              portnr: ports[k][0] === 'p' ? `lag${ports[k].substring(2)}` : (parseInt(ports[k]) - 1)
            };
          }
          return values;
        }
      }
    }
  }
}
