module.exports = {
  network: {
    mirror: {
      0: {
        $: 'guard',
        arg: {
          $: 'fetch',
          arg: '/mirror.cgi',
          method: 'post',
          frame: 'maincontent',
          params: {
            mirroring: { $: 'kv', map: { true: 0, false: 1 } },
            select: { $: 'kv', map: v => v + 1 },
            hiddenMem: {
              $: 'fn',
              arg: ctx => {
                ports = ctx.readKV('network.mirror.0.port');
                const mem = '00000';
                for (let p in ports) {
                  const port = ports[p] || {};
                  if (port.ingress || port.egress) {
                    mem[p] = '1';
                  }
                }
                return mem;
              }
            },
            hash: { $: 'selector', arg: '#hash' }
          }
        }
      }
    }
  }
};
