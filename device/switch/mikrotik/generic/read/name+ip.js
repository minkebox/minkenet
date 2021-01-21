function str(v) {
  return Buffer.from(v, 'hex').toString('utf8');
}

function mac(m) {
  return m.replace(/(..)(?!$)/g,'$1:');
}

module.exports = {
  $1: {
    $: 'fetch',
    arg: '/sys.b',
    transform: v => `$R=${v}`,
    type: 'eval',
    values: {
      system: {
        name: { $: 'eval', arg: '$R.id', map: str },
        macAddress: {
          0: { $: 'eval', arg: '$R.mac', map: mac }
        },
        firmware: {
          version: { $: 'eval', arg: '$R.ver', map: str }
        },
        ipv4: {
          mode: { $: 'eval', arg: '$R.iptp', map: { 0: 'dhcp', 1: 'static', 2: 'dhcp' } },
          address: { $: 'eval', arg: `'cip' in $R ? $R.cip : $R.ip`, map: Maps.intToIPAddress }
        }
      },
      network: {
        vlans: {
          ivl: { $: 'eval', arg: '$R.ivl', map: { 0: false, 1: true } },
          vlan: {
            $: 'fn',
            arg: async ctx => {
              const vid = await ctx.eval({ $: 'eval', arg: '$R.avln' });
              if (vid) {
                return { [vid]: { management: true } };
              }
              else {
                return {};
              }
            }
          }
        },
        igmp: {
          snoop: { $: 'eval', arg: '$R.igmp', map: { 0: false, 1: true } }
        }
      }
    }
  }
};
