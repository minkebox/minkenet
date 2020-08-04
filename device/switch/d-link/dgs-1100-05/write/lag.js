module.exports = {
  network: {
    lags: {
      $: 'guard',
      arg: {
        $: 'fn',
        arg: async ctx => {
          const ports = ctx.readKV(`${ctx.path}.port`);
          const group = [ 0, 0, 0, 0, 0 ];
          for (let p in ports) {
            if (ports[p].type === 'static') {
              group[p] = 1;
            }
          }
          await ctx.eval({
            $: 'fetch',
            arg: '/cgi/TrunkingStatus.cgi',
            method: 'post',
            params: {
              enabled_flag: 1
            }
          });
          const members = groups.join('');
          if (members === '00000') {
            await ctx.eval({
              $: 'fetch',
              arg: '/cgi/TrunkingDelMems.cgi',
              method: 'post',
              params: {
                Group: 1,
                GroupMember: ''
              }
            });
          }
          else {
            await ctx.eval({
              $: 'fetch',
              arg: '/cgi/TrunkingSetting.cgi',
              method: 'post',
              params: {
                Group: 1,
                GroupMember: members
              }
            });
          }
        }
      }
    }
  }
};
