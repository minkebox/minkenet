module.exports = {
  network: {
    physical: {
      port: {
        $: 'foreach',
        arg: itr => [{
          $: 'guard',
          arg: {
            $: 'fetch',
            arg: '/status.cgi',
            method: 'post',
            frame: 'maincontent',
            params: {
              SPEED: {
                $: 'fn',
                arg: ctx => {
                  const speed = ctx.readKV(`${itr.path}.speed`);
                  const enable = ctx.readKV(`${itr.path}.enable`);
                  if (!enable) {
                    return 2;
                  }
                  else switch (speed) {
                    case 'auto':
                    default:
                      return 1;
                    case '10M (H)':
                      return 3;
                    case '10M':
                      return 4;
                    case '100M (H)':
                      return 5;
                    case '100M':
                      return 6;
                  }
                }
              },
              FLOW_CONTROL: {
                $: 'kv',
                arg: `${itr.path}.flowcontrol`,
                map: {
                  true: 1,
                  false: 2
                }
              },
              [`port${itr.index + 1}`]: 'checked',
              hash: {
                $: 'selector',
                arg: '#hash'
              }
            }
          }
        }]
      }
    }
  }
};
