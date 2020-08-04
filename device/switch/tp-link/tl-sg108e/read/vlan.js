module.exports = {
  network: {
    vlans: {
      $: 'navigate',
      arg: '/Vlan8021QRpm.htm',
      frame: 'mainFrame',
      values: {
        $: 'fn',
        arg: async function() {
          const str = await this.eval('eval', 'JSON.stringify(window.qvlan_ds)');
          const info = JSON.parse(str);
          const vlans = {};
          for (let i = 0; i < info.vids.length; i++) {
            const u = info.untagMbrs[i];
            const t = info.tagMbrs[i];
            const port = {};
            for (p = 0; p < 8; p++) {
              if (t & (1 << p)) {
                port[p] = { tagged: true };
              }
              else if (u & (1 << p)) {
                port[p] = { tagged: false };
              }
            }
            if (Object.keys(port).length) {
              vlans[info.vids[i]] = {
                name: info.names[i],
                port: port
              };
            }
          }
          return {
            '8021q': info.state ? true : false,
            vlan: vlans
          };
        }
      },
      pvid: {
        $: 'navigate',
        arg: '/Vlan8021QPvidRpm.htm',
        frame: 'mainFrame',
        type: 'eval',
        values: {
          $: 'iterate',
          arg: itr => [{
            pvid: `pvid_ds.pvids[${itr.index}]`
          }]
        }
      }
    }
  }
};
