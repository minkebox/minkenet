module.exports = {
  network: {
    vlans: {
      $: 'fetch',
      arg: '/fwd.b',
      type: 'eval+r',
      values: {
        pvid: {
          $: 'iterate',
          arg: itr => [{
            pvid: `$R.dvid[${itr.index}]`
          }]
        },
        vlan$0: `(function(){$P=$R;return{}})()`, // Stash info for use by next fetch
        vlan$1: {
          $: 'fetch',
          arg: '/vlan.b',
          type: 'eval+r',
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
