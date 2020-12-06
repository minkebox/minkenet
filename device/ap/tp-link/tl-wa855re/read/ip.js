const { valHooks } = require("jquery");

module.exports = {
  system: {
    $: 'fetch',
    arg: {
      $: 'fn',
      arg: async ctx => '/?code=2&asyn=0&id=' + encodeURIComponent(await ctx.eval('eval', 'jQuery.su.url.session'))
    },
    method: 'post',
    params: '4|1,0,0#1|1,0,0',
    transform: val => {
      const a = {};
      val.split('\n').forEach(line => {
        const p = line.replace('\r', '').split(' ');
        let k = null;
        let v = null;
        if (p.length === 2) {
          k = p[0];
          v = p[1];
        }
        else if (p.length === 3) {
          k = `${p[0]}_${p[1]}`;
          v = p[2];
        }
        if (k) {
          while (k in a) {
            k = `${k}_`;
          }
          a[k] = v;
        }
      });
      return a;
    },
    type: 'jsonp',
    values: {
      macAddress: {
        0: 'mac_0'
      },
      ipv4: {
        mode: {
          $: 'jsonp',
          arg: 'mode',
          map: {
            1: 'static',
            0: 'dhcp'
          }
        },
        address: 'ip',
        netmask: 'mask',
        gateway: 'gateway',
        dns: 'dns_0'
      }
    }
  }
};
