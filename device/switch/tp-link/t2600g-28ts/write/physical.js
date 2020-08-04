module.exports = {
  network: {
    physical: {
      $: 'foreach',
      arg: ctx => [{
        $: 'fetch',
        arg: '/userRpm/PortStatusSetRpm.htm',
        params: {
          submit: 1,
          desc: { $: 'kv', arg: `${ctx.path}.name` },
          status: { $: 'kv', arg: `${ctx.path}.enable`, map: { true: 1, false: 0 } },
          speed: -1,
          duplex: -1,
          flowctrl: { $: 'kv', arg: `${ctx.path}.flowcontrol`, map: { true: 1, false: 0 } },
          jumbo: { $: 'kv', arg: `${ctx.path}.jumbo`, map: { true: 1, false: 0 } },
          row: `1/0/${ctx.key}`,
          _tid_: {
            $: 'eval',
            arg: 'top.g_tid'
          }
        }
      }]
    }
  }
};
