const Helpers = require('./_helpers');

module.exports = {
  system: {
    $: 'fetch',
    arg: {
      $: 'fn',
      arg: async ctx => '/?code=2&asyn=0&id=' + encodeURIComponent(await ctx.eval('eval', 'jQuery.su.url.session'))
    },
    method: 'post',
    params: '4|1,0,0#1|1,0,0#8|1,0,0',
    transform: Helpers.convert,
    type: 'jsonp',
    values: {
      name: 'hostName',
      macAddress: {
        0: {
          $: 'jsonp',
          arg: 'mac_0',
          map: Maps.toMacAddress
        }
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
