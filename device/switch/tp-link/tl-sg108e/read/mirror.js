module.exports = {
  network: {
    mirror: {
      0: {
        $: 'navigate',
        arg: '/PortMirrorRpm.htm',
        frame: 'mainFrame',
        type: 'eval',
        values: {
          enable: '!!window.MirrEn',
          target: {
            $: 'eval',
            arg: 'window.MirrPort',
            map: v => v - 1
          },
          port: {
            $: 'fn',
            arg: async ctx => {
              const ports = {};
              const nrports = await ctx.eval('eval', 'window.max_port_num');
              const info = JSON.parse(await ctx.eval('eval', 'JSON.stringify(window.mirr_info)'));
              for (let i = 0; i < nrports; i++) {
                const port = {};
                if (info.ingress[i]) {
                  port.ingress = true;
                }
                if (info.egress[i]) {
                  port.egress = true;
                }
                for (const k in port) {
                  ports[i] = port;
                  break;
                }
              }
              return ports;
            }
          }
        }
      }
    }
  }
};
