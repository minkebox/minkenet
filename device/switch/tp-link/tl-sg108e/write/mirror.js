module.exports = {
  network: {
    mirror: {
      0: {
        $: 'guard',
        arg: {
          $1: {
            $: `fetch`,
            arg: `/mirror_enabled_set.cgi`,
            params: {
              state: {
                $: `kv`,
                arg: 'network.mirror.0.enable',
                map: {
                  true: 1,
                  false: 0
                }
              },
              mirroringport: {
                $: 'kv',
                arg: 'network.mirror.0.target',
                map: v => v + 1
              },
              mirrorenable: 'Apply'
            }
          },
          port: {
            $: 'foreach',
            arg: itr => [{
              $: 'fetch',
              arg: '/PortMirrorRpm.htm',
              params: {
                mirroredport: itr.key + 1,
                ingressState: {
                  $: 'kv',
                  arg: `${itr.path}.ingress`,
                  map: {
                    true: 1,
                    false: 0
                  }
                },
                egressState: {
                  $: 'kv',
                  arg: `${itr.path}.egress`,
                  map: {
                    true: 1,
                    false: 0
                  }
                },
                mirrored_submit: 'Apply'
              }
            }]
          }
        }
      }
    }
  }
};
