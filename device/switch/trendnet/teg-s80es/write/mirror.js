module.exports = {
  network: {
    mirror: {
      0: {
        $: 'guard',
        arg: {
          $: 'fetch',
          arg: '/cgi/PortMirroring.cgi',
          method: 'post',
          params: {
            $: 'fn',
            arg: async ctx => {
              const mirror = ctx.readKV(ctx.path);
              if (!mirror.enable) {
                return {
                  cEn: 0,
                  sMode: 0,
                  sTagP: 1,
                  SrcList: ''
                }
              }
              const ports = '00000000';
              let mode = 0;
              for (let p in mirror.port) {
                if (mirror.port[p].ingress) {
                  ports[p] = 1;
                  mode |= 1;
                }
                if (mirror.port[p].egress) {
                  ports[p] = 1;
                  mode |= 2;
                }
              }
              return {
                cEn: 1,
                sMode: mode ? mode - 1 : 0,
                sTagP: mirror.target + 1,
                SrcList: ports
              };
            }
          }
        }
      }
    }
  }
};
