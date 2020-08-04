module.exports = {
  system: {
    ipv4: {
      dns: {
        $: 'guard',
        arg: {
          $: 'fetch',
          arg: '/iss/specific/rpc.js',
          frame: 'myframe',
          method: 'post',
          params: {
            Gambit: {
              $: 'eval',
              arg: 'GetInputGambit()'
            },
            RPC: {
              $: 'tojson',
              arg: {
                method: 'CommonSet',
                id: 0,
                params: {
                  dnsNameServerIPv4Addr: {
                    $: 'kv',
                    arg: 'system.ipv4.dns',
                    map: ip => `${ip.split('.').reduce((ipInt, octet) => (ipInt << 8) + parseInt(octet), 0) >>> 0}`
                  },
                  dnsNameServerIPv6Addr: '00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00',
                  Template: 'dnsGlobal'
                }
              }
            }
          }
        }
      }
    }
  }
}
