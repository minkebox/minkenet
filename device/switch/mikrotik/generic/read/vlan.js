module.exports = {
  network: {
    vlans: {
      $: 'fetch',
      arg: '/fwd.b',
      transform: v => `$P=${v}`,
      type: 'eval',
      values: {
        pvid: {
          $: 'iterate',
          arg: itr => [{
            pvid: `$P.dvid[${itr.index}]`
          }]
        },
        vlan: {
          $: 'fetch',
          arg: '/vlan.b',
          transform: v => `$R=${v}`,
          type: 'eval',
          values: {
            $: 'iterate',
            arg: itr => [ `$R[${itr.index}].vid`, {
              igmp: {
                snoop: { $: 'eval', arg: `$R[${itr.index}].igmp`, map: { 0: false, 1: true } }
              },
              port: {
                $: 'fn',
                arg: async function() {
                  const ports = {};
                  const mbr = await this.eval('eval', `$R[${itr.index}].mbr`);
                  const pvid = JSON.parse(await this.eval('eval', `JSON.stringify($P.dvid)`));
                  for (let i = 0; i < 9; i++) {
                    if (!!(mbr & (1 << i))) {
                      if (pvid[i] == itr.key) {
                        ports[i] = { tagged: false };
                      }
                      else {
                        ports[i] = { tagged: true };
                      }
                    }
                  }
                  return ports;
                }
              },
              learning: { $: 'eval', arg: `$R[${itr.index}].lrn`, map: { 0: false, 1: true } },
              mirror: { $: 'eval', arg: `$R[${itr.index}].mrr`, map: { 0: false, 1: true } },
              isolation: { $: 'eval', arg: `$R[${itr.index}].piso`, map: { 0: false, 1: true } },
            }]
          }
        }
      }
    }
  }
};
