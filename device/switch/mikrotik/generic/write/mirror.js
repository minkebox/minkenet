const hex = (v) => {
  const r = `${v.toString(16)}`;
  return '0x' + `00000000${r}`.substr(-2*Math.ceil(r.length / 2));
}

module.exports = {
  network: {
    mirror: {
      0: {
        $: 'guard',
        arg: {
          $: 'fetch',
          arg: '/fwd.b',
          method: 'post',
          params: {
            $: 'fn',
            arg: ctx => {
              const mrto = 1 << ctx.readKV(`${ctx.path}.target`);
              let imr = 0;
              let omr = 0;
              if (ctx.readKV(`${ctx.path}.enable`)) {
                const ports = ctx.readKV(`${ctx.path}.port`);
                for (let p in ports) {
                  if (ports[p].ingress) {
                    imr |= 1 << p;
                  }
                  if (ports[p].egress) {
                    omr |= 1 << p;
                  }
                }
              }
              return `[mrto:${hex(mrto)},imr:${hex(imr)},omr:${hex(omr)}]`
            }
          }
        }
      }
    }
  }
};
