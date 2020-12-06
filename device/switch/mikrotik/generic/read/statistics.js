module.exports = {
  network: {
    physical: {
      port: {
        $: 'fetch',
        arg: '/!stats.b',
        transform: v => `$R=${v}`,
        type: 'eval',
        values: {
          $: 'iterate',
          arg: itr => [{
            statistics: {
              rx: {
                bytes: { $: 'eval', arg: `$R.rb[${itr.index}]` },
                packets: { $: 'eval', arg: `$R.rtp[${itr.index}]` },
                unicast: { $: 'eval', arg: `$R.rup[${itr.index}]` },
                broadcast: { $: 'eval', arg: `$R.rbp[${itr.index}]` },
                multicast: { $: 'eval', arg: `$R.rmp[${itr.index}]` },
                errors: { $: 'eval', arg: `$R.rr[${itr.index}]+$R.rae[${itr.index}]+$R.fr[${itr.index}]+$R.rpp[${itr.index}]+$R.rte[${itr.index}]+$R.rfcs[${itr.index}]+$R.rov[${itr.index}]` },
                undersized: { $: 'eval', arg: `$R.rr[${itr.index}]` },
                oversized: { $: 'eval', arg: `$R.rae[${itr.index}]` },
                fragment: { $: 'eval', arg: `$R.fr[${itr.index}]` },
                pause: { $: 'eval', arg: `$R.rpp[${itr.index}]` },
                mac: { $: 'eval', arg: `$R.rte[${itr.index}]` },
                fcs: { $: 'eval', arg: `$R.rfcs[${itr.index}]` },
                overrun: { $: 'eval', arg: `$R.rov[${itr.index}]` }
              },
              tx: {
                bytes: { $: 'eval', arg: `$R.tb[${itr.index}]` },
                packets: { $: 'eval', arg: `$R.ttp[${itr.index}]` },
                unicast: { $: 'eval', arg: `$R.tup[${itr.index}]` },
                broadcast: { $: 'eval', arg: `$R.tbp[${itr.index}]` },
                multicast: { $: 'eval', arg: `$R.tmp[${itr.index}]` },
                errors: { $: 'eval', arg: `$R.tpp[${itr.index}]+$R.tur[${itr.index}]+$R.tcl[${itr.index}]+$R.tmc[${itr.index}]+$R.tec[${itr.index}]+$R.tlc[${itr.index}]+$R.tdf[${itr.index}]` },
                pause: { $: 'eval', arg: `$R.tpp[${itr.index}]` },
                undersized: { $: 'eval', arg: `$R.tur[${itr.index}]` },
                collisions: { $: 'eval', arg: `$R.tcl[${itr.index}]` },
                multiplecollisions: { $: 'eval', arg: `$R.tmc[${itr.index}]` },
                excessivecollisions: { $: 'eval', arg: `$R.tec[${itr.index}]` },
                latecollisions: { $: 'eval', arg: `$R.tlc[${itr.index}]` },
                deferred: { $: 'eval', arg: `$R.tdf[${itr.index}]` }
              }
            }
          }]
        }
      }
    }
  }
}
