module.exports = {
  network: {
    physical: {
      port: {
        $: 'navigate',
        arg: '/QosBandWidthControlRpm.htm',
        frame: 'mainFrame',
        values: {
          $: 'fn',
          arg: async ctx => {
            const bcInfo = await ctx.eval('eval', 'bcInfo');
            const port = {};
            for (let i = 0; i < bcInfo.length; i += 3) {
              port[i / 3] = {
                limit: {
                  ingress: bcInfo[i] / 8 * 1024,
                  egress: bcInfo[i + 1] / 8 * 1024
                }
              }
            }
            return port;
          }
        }
      }
    }
  }
};
