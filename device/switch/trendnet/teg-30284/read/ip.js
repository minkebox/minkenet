module.exports = {
  system$1: {
    ipv4: {
      $: 'fetch',
      frame: 'myframe',
      arg: '/iss/specific/rpc.js',
      method: 'post',
      params: {
        Gambit: {
          $: 'eval',
          arg: 'GetInputGambit()'
        },
        RPC: JSON.stringify({ method: 'CommonGet', id: 0, params: { Template: 'sysIPv4SysSettings' } })
      },
      type: 'jsonp',
      values: {
        mode: {
          $: 'jsonp',
          arg: 'result.ipv4sysIpAddrCfgMode',
          map: {
            1: 'static',
            2: 'dhcp'
          }
        },
        address: 'result.ipv4sysIpAddr',
        netmask: 'result.ipv4SysIpSubnetMask',
        gateway: 'result.ipv4SysGateway'
      }
    }
  },
  system$2: {
    ipv4: {
      dns: {
        $: 'fetch',
        frame: 'myframe',
        arg: '/iss/specific/rpc.js',
        method: 'post',
        params: {
          Gambit: {
            $: 'eval',
            arg: 'GetInputGambit()'
          },
          RPC: JSON.stringify({ method: 'CommonGet', id: 0, params: { Template: 'dnsGlobal' } })
        },
        type: 'jsonp',
        values: {
          $: 'jsonp',
          arg: 'result.dnsNameServerIPv4Addr',
          map: val => val.split(':').map(v => parseInt(v, 16)).join('.')
        }
      }
    }
  }
};
