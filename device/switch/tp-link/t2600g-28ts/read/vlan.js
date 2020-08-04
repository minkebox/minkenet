module.exports = {
  network: {
    vlans: {
      vlan: {
        $: 'navigate',
        arg: '/userRpm/vlan1QConfigRpm.htm',
        frame: 'mainFrame',
        values: {
          $: 'fn',
          arg: async function() {
            const info = JSON.parse(await this.eval('eval', 'JSON.stringify(info)'));
            const tid = await this.eval('eval', 'top.g_tid');
            function make(tag) {
              const p = [];
              if (tag) {
                tag = tag.split(',');
                tag.forEach(t => {
                  t = t.split('/')[2].split('-');
                  for (let i = parseInt(t[0]); i <= parseInt(t[1] || t[0]); i++) {
                    p.push(i - 1);
                  }
                });
              }
              return p;
            }
            const vlans = {};
            for (let i = 0; i < info.length; i++) {
              const vid = info[i][0];
              await this.eval('navigate', `/userRpm/vlan1QEditVlanRpm.htm?_tid_=${tid}&type=2&vid=${vid}`);
              const portUntag = make(await this.eval('eval', 'window.portUntag'));
              const portTag = make(await this.eval('eval', 'window.portTag'));
              const p = {};
              for (let i = 0; i < 28; i++) {
                if (portUntag.indexOf(i) !== -1) {
                  p[i] = { tagged: false };
                }
                else if (portTag.indexOf(i) !== -1) {
                  p[i] = { tagged: true };
                }
              }
              vlans[vid] = {
                name: info[i][1],
                port: p
              };
            }
            return vlans;
          }
        }
      },
      pvid: {
        $: `navigate`,
        arg: `/userRpm/vlan1QPortSetRpm.htm`,
        frame: `mainFrame`,
        type: `eval`,
        values: {
          $: `iterate`,
          arg: itr => [{
            pvid: `info[1][${itr.index}][2]`
          }]
        }
      }
    }
  }
};
