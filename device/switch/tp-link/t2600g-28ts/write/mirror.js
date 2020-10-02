module.exports = {
  network: {
    mirror: {
      0: {
        $: 'guard',
        arg: {
          port: {
            $: 'foreach',
            arg: ctx => [{
              $: 'guard',
              arg: {
                $: 'fetch',
                arg: '',
                method: 'post',
                params: {
                  SrcSubmit: true,
                  session: 1,
                  ingress: { $: 'kv', arg: `${ctx.path}.ingress`, map: { true: 1, false: 0 }},
                  egress: { $: 'kv', arg: `${ctx.path}.egress`, map: { true: 1, false: 0 }},
                  portlist: `1/0/${ctx.key + 1}`,
                  _tid_: {
                    $: 'eval',
                    arg: 'top.g_tid'
                  }
                }
              }
            }]
          }
        }
      }
    }
  }
};
