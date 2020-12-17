module.exports = {
  system: {
    $: 'guard',
    key: 'system.name',
    arg: {
      $: 'fetch',
      arg: {
        $: 'fn',
        arg: async ctx => '/?code=1&asyn=0&id=' + encodeURIComponent(await ctx.eval('eval', 'jQuery.su.url.session'))
      },
      method: 'post',
      params: {
        $: 'fn',
        arg:  ctx => `id 8|1,0,0\nhostName ${ctx.readKV('system.name')}`
      }
    }
  }
};
