module.exports = {
  network: {
    clients: {
      $: 'fetch',
      frame: 'myframe',
      arg: '/iss/specific/dynamic_fdb_table_data.js',
      params: {
        Gambit: {
          $: 'eval',
          arg: 'GetInputGambit()'
        },
        Port: '0',
        From: '1',
        To: '256'
      },
      values: {
        $: 'iterate',
        arg: itr => [{
          mac: { $: 'eval', arg: `FdbEntry[${itr.index}].FdbMacAddr`, map: mac => mac.replace(/-/g,':').toLowerCase() },
          vlan: `FdbEntry[${itr.index}].FdbId`,
          portnr: {
            $: 'fn',
            arg: async ctx => {
              const portnr = await ctx.eval('eval', `FdbEntry[${itr.index}].FdbPort - 1`);
              if (portnr <= 27) {
                return portnr;
              }
              return `lag${portnr - 27}`;
            }
          }
        }]
      }
    }
  }
}
