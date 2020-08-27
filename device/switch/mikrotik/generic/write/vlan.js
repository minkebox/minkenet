const hex = (v) => {
  const r = `${v.toString(16)}`;
  return '0x' + `00000000${r}`.substr(-2*Math.ceil(r.length / 2));
}

module.exports = {
  network: {
    vlans: {
      $: 'guard',
      arg: {
        $: 'fetch',
        arg: '/vlan.b',
        method: 'post',
        params: {
          $: 'fn',
          arg: async ctx => {
            const params = [];
            let management = 0;
            const vlans = ctx.readKV(`network.vlans.vlan`);
            for (let vid in vlans) {
              const igmp = vlans[vid].igmp.snoop ? 1 : 0;
              if (vlan[vid].management) {
                management = vid;
              }
              let members = 0;
              const ports = vlans[vid].port;
              for (let p in ports) {
                members |= 1 << p;
              }
              params.push(`{vid:${hex(vid)},piso:0x00,lrn:0x01,mrr:0x00,igmp:${hex(igmp)},mbr:${hex(members)}}`);
            }
            if (management) {
              await ctx.eval({
                $: 'fetch',
                arg: '/sys.b',
                method: 'post',
                params: `{avln:${hex(management)}}`
              });
            }
            return `[${params.join(',')}]`;
          }
        }
      }
    },
    pvid: {
      $: 'guard',
      arg: {
        $: 'fetch',
        arg: '/fwd.b',
        method: 'post',
        params: {
          $: 'fn',
          arg: ctx => {
            const pvids = ctx.readKV(`network.vlans.pvid`);
            const dvid = [];
            const vlan = [];
            const vlni = [];
            for (let pvid in pvids) {
              dvid.push(hex(pvids[pvid].pvid));
              vlan.push('0x01');
              vlni.push('0x00');
            }
            return `[vlan:[${vlan.join(',')}],vlni:[${vlni.join(',')}],dvid:[${dvid.join(',')}],fvid:0x00]`;
          }
        }
      }
    }
  }
};
