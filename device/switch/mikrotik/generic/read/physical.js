function str(v) {
  return Buffer.from(v, 'hex').toString('utf8');
}

module.exports = {
  network: {
    physical: {
      port: {
        $: 'fetch',
        arg: '/link.b',
        type: 'eval+r',
        values: {
          $: 'iterate',
          arg: itr => [{
            id: `${itr.index + 1}`,
            name: { $: 'eval', arg: `$R.nm[${itr.index}]`, map: str },
            status: { $: 'eval', arg: `!!($R.lnk & (1 << ${itr.index}))`, map: { true: 'up', false: 'down' } },
            type: { $: 'eval', arg: `$R.spd[${itr.index}]`, map: { 2: '1G', 3: '10G', 7: '-' } },
            framesize: {
              $: 'fn',
              arg: ctx => {
                switch (ctx.readKV('system.hardware.model')) {
                  case 'CSS106-5G-1S':
                    return 9198;
                  case 'CRS309-1G-8S+':
                    return 10218;
                  default:
                    return 1518;
                }
              }
            },
            flowcontrol: `!!($R.fct & (1 << ${itr.index}))`,
            speed: {
              $: 'eval',
              arg: `($R.an & (1 << ${itr.index})) ? 'A' : $R.spdc[${itr.index}]`,
              map: {
                A: 'auto',
                0: '10M',
                1: '100M',
                2: '1G'
              }
            },
            enable: `!!($R.en & (1 << ${itr.index}))`
          }]
        }
      }
    }
  }
};
