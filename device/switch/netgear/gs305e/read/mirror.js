module.exports = {
  network: {
    mirror: {
      0: {
        $: 'navigate',
        arg: '/mirror.cgi',
        frame: 'maincontent',
        values: {
          enable: {
            $: 'selector',
            arg: `#mirroring`,
            map: {
              0: true,
              1: false
            }
          },
          target: {
            $: `selector`,
            arg: `#DestiPort`,
            map: v => v - 1
          },
          port: {
            $: `iterate`,
            limit: 5,
            arg: itr => [{
              ingress: {
                $: 'selector',
                arg: `#unit1 .portMember:nth-child(${itr.index + 1}) .portImage.checked`,
                map: v => true,
                fallback: false
              },
              egress: {
                $: 'selector',
                arg: `#unit1 .portMember:nth-child(${itr.index + 1}) .portImage.checked`,
                map: v => true,
                fallback: false
              }
            }]
          }
        }
      }
    }
  }
};
