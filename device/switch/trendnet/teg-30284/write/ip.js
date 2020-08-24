//
// Note. We cannot set the IP address using OIDs, but we can this way.
//
module.exports = {
  system: {
    ipv4: {
      $: 'guard',
      arg: {
        $: 'fetch',
        arg: '/iss/specific/rpc.js',
        frame: 'myframe',
        method: 'post',
        wait: 1,
        params: {
          Gambit: {
            $: 'eval',
            arg: 'GetInputGambit()'
          },
          RPC: {
            $: 'tojson',
            arg: {
              method: 'Ipv4Info_Set',
              id: 0,
              params: {
                ipv4sysIpAddrCfgMode: {
                  $: 'kv',
                  arg: 'system.ipv4.mode',
                  map: {
                    static: 1,
                    dhcp: 2
                  }
                },
                ipv4sysIpAddr: { $: 'kv', arg: 'system.ipv4.address' },
                ipv4SysIpSubnetMask: { $: 'kv', arg: 'system.ipv4.netmask' },
                ipv4SysGateway: { $: 'kv', arg: 'system.ipv4.gateway' }
              }
            }
          }
        }
      }
    }
  }
};
