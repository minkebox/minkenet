module.exports = {
  $2: {
    $: 'fetch',
    arg: {
      $: 'eval',
      arg: `window.location.pathname.replace(/(tok=.*admin).*/,'$1')+'/status/overview?status=1'`
    },
    type: 'jsonp',
    values: {
      system: {
        ipv4: {
          mode: '$.wan.proto',
          address: '$.wan.ipaddr',
          netmask: '$.wan.netmask',
          gateway: '$.wan.gwaddr',
          dns: '$.wan.dns[0]'
        },
        macAddress: {
          1: {
            $: 'jsonp',
            arg: '$.wifinets[0].mac',
            map: mac => mac.toLowerCase()
          },
          2: {
            $: 'jsonp',
            arg: '$.wifinets[1].mac',
            map: mac => mac.toLowerCase()
          }
        }
      },
      network: {
        clients: {
          $: 'fn',
          arg: async function() {
            const clients = {};
            let i = 0;
            this.context.wifinets.forEach(wifi => {
              wifi.networks.forEach(net => {
                for (let mac in net.assoclist) {
                  clients[i] = {
                    mac: mac,
                    portnr: net.ssid,
                    ssid: net.ssid
                  }
                  if (net.isolation != '0') {
                    client[i].vlan = net.vlan_id;
                  }
                  i++;
                }
              });
            });
            return clients;
          }
        }
      }
    }
  }
};
