module.exports = {
  network: {
    lags: {
      $: 'guard',
      arg: {
        $: 'fn',
        arg: async ctx => {
          const ports = ctx.readKV(`${ctx.path}.port`);
          const groups = [[ 0, 0, 0, 0, 0, 0, 0, 0 ],[ 0, 0, 0, 0, 0, 0, 0, 0 ]];
          for (let p in ports) {
            if (ports[p].type === 'static') {
              groups[port[p].group - 1][p] = 1;
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
          for (let i = 0; i < groups.length; i++) {
            const members = groups[i].join('');
            if (members === '00000000') {
              await ctx.eval({
                $: 'fetch',
                arg: '/cgi/TrunkingDelMems.cgi',
                method: 'post',
                params: {
                  Group: i + 1,
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
                  Group: i + 1,
                  GroupMember: members
                }
              });
            }
          }
        }
      }
    }
  }
};
