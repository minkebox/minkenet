module.exports = {
  network: {
    physical: {
      port: {
        $: 'foreach',
        arg: itr => [{
          limit: {
            $: 'guard',
            arg: {
              $: 'fetch',
              arg: '/iss/specific/port_ratectrl.html',
              method: 'post',
              params: {
                Gambit: {
                  $: 'eval',
                  arg: 'top.GAMBIT'
                },
                issExtRateCtrlIndex: `${itr.index + 1}`,
                issExtRateCtrlPortIngressRateLimit: {
                  $: 'kv',
                  arg: `${itr.path}.ingress`,
                  map: v => {
                    v = 8 * v / (1024 * 1024);
                    if (v <= 1) {
                      return 2;
                    }
                    if (v <= 5) {
                      return 3;
                    }
                    if (v <= 10) {
                      return 4;
                    }
                    if (v <= 50) {
                      return 5;
                    }
                    if (v <= 100) {
                      return 6;
                    }
                    if (v <= 500) {
                      return 7;
                    }
                    return 1;
                  }
                },
                issExtRateCtrlPortEgressRateLimit: {
                  $: 'kv',
                  arg: `${itr.path}.egress`,
                  map: v => {
                    v = 8 * v / (1024 * 1024);
                    if (v <= 1) {
                      return 2;
                    }
                    if (v <= 5) {
                      return 3;
                    }
                    if (v <= 10) {
                      return 4;
                    }
                    if (v <= 50) {
                      return 5;
                    }
                    if (v <= 100) {
                      return 6;
                    }
                    if (v <= 500) {
                      return 7;
                    }
                    return 1;
                  }
                },
                ACTION: 'apply'
              }
            }
          }
        }]
      }
    }
  }
};
