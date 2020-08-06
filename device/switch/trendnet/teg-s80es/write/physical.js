module.exports = {
  network: {
    physical: {
      port: {
        $: 'foreach',
        arg: itr => [{
          $: 'guard',
          arg: {
            $: 'fetch',
            arg: '/cgi/set_port.cgi',
            method: 'post',
            params: {
              port_f: itr.index + 1,
              port_t: itr.index + 1,
              stats: { $: 'kv', arg: `${itr.path}.enable`, map: { true: 1, false: 0 } },
              speed: {
                $: 'kv',
                arg: `${itr.path}.speed`,
                map: {
                  'auto': 0,
                  '10M (H)': 1,
                  '10M': 2,
                  '100M (H)': 3,
                  '100M': 4,
                  '1G': 5
                }
              },
              flow: { $: 'kv', arg: `${itr.path}.flowcontrol`, map: { true: 1, false: 0 } },
              desc: { $: 'kv', arg: `${itr.path}.name` }
            }
          }
        }]
      }
    }
  }
};
