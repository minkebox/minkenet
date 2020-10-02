module.exports = {
  network: {
    mirror: {
      0: {
        $: 'navigate',
        arg: '/userRpm/PortMirrorSetRpm.htm',
        frame: 'mainFrame',
        values: {
          enable: true,
          target: {
            $: 'eval',
            arg: `MirrorInfo[2] ? MirrorInfo[2].split('/')[2] - 1 : 0`
          },
          port: {
            $: 'iterate',
            arg: itr => [{
              ingress: {
                $: 'eval',
                arg: `!!info[1][1]`
              },
              egress: {
                $: 'eval',
                arg: `!!info[1][2]`
              }
            }]
          }
        }
      }
    }
  }
};
