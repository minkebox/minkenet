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
              arg: `/port_setting.cgi`,
              params: {
                igrRate: {
                  $: 'kv',
                  arg: `${itr.path}.ingress`,
                  map: v => v * 8 / 1024
                },
                egrRate: {
                  $: 'kv',
                  arg: `${itr.path}.egress`,
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
