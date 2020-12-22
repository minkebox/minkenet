module.exports = {
  network: {
    clients: {
      $: 'fetch',
      arg: {
        $: 'fn',
        arg: async ctx => '/?code=2&asyn=0&id=' + encodeURIComponent(await ctx.eval('eval', 'jQuery.su.url.session'))
      },
      method: 'post',
      params: '33|1,1,0#13|1,0,0',
      type: 'literal',
      values: {
        $: 'fn',
        arg: async ctx => {
          let ssid = null;
          const list = {};
          ctx.context.split('\n').forEach(line => {
            const p = line.replace('\r', '').split(' ');
            const k = p[1];
            switch (p[0]) {
              case 'ip':
                const ip = p[2];
                if (ip !== '0.0.0.0') {
                  list[k] = { ip: ip };
                }
                break;
              case 'mac':
                if (k in list) {
                  list[k].mac = p[2].replace(/-/g,':').toLowerCase();
                }
                break;
              case 'type':
                if (k in list) {
                  if (p[2] == '0') {
                    list[k].portnr = 'lan';
                  }
                  else if (ssid) {
                    list[k].ssid = ssid;
                  }
                }
                break;
              case 'name':
                if (k in list) {
                  list[k].hostname = p[2];
                }
                break;
              case 'cSsid':
                ssid = k;
                break;
              default:
                break;
            }
          });
          return Object.values(list);
        }
      }
    }
  }
};
