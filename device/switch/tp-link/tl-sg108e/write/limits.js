module.exports = {
  network: {
    physical: {
      port: {
        $: 'foreach',
        arg: itr => [{
          limit: {
            $: `guard`,
            arg: {
              $: `fetch`,
              arg: `/qos_bandwidth_set.cgi`,
              method: 'post',
              params: {
                igrRate: {
                  $: 'kv',
                  arg: `${itr.path}.limit.ingress`,
                  map: v => v * 8 / 1024
                },
                egrRate: {
                  $: 'kv',
                  arg: `${itr.path}.limit.egress`,
                  map: v => v * 8 / 1024
                },
                [`sel_${itr.index + 1}`]: 1,
                apply: 'Apply'
              }
            }
          }
        }]
      }
    }
  }
};
