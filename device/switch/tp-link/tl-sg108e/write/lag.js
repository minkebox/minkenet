module.exports = {
  network: {
    lags: {
      $: 'guard',
      arg: {
        $: 'fn',
        arg: async ctx => {
          const ports = ctx.readKV(`${ctx.path}.port`);
          const oports = ctx.readKV(`${ctx.path}.port`, { original: true });
          const groups = {};
          const ogroups = {};
          for (let p in ports) {
            if (ports[p].type === 'static') {
              const g = groups[ports[p].group] || (groups[ports[p].group] = []);
              g.push(p);
            }
            else if (oports[p].type === 'static') {
              ogroups[ports[p].group] = true;
            }
          }
          for (let g in groups) {
            const portids = groups[g].map(p => `portid=${p}`).join('&');
            await ctx.eval('fetch', `/port_trunk_set.cgi?groupId=${g}&${portids}&setapply=Apply`);
          }
          for (let g in ogroups) {
            await ctx.eval('fetch', `/port_trunk_display.cgi?chk_trunk=${g}&setDelete=Delete`);
          }
        }
      }
    }
  }
};
