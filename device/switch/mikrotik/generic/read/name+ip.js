function str(v) {
  return Buffer.from(v, 'hex').toString('utf8');
}

function mac(m) {
  return m.replace(/(..)(?!$)/g,'$1:');
}

function int2ip(ip32) {
  let ip = ip32 % 256;
  for (let i = 3; i > 0; i--) {
    ip32 = Math.floor(ip32 / 256);
    ip = `${ip}.${ip32 % 256}`;
  }
  return ip;
}


module.exports = {
  $1: {
    $: 'fetch',
    arg: '/sys.b',
    type: 'eval+r',
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
          address: { $: 'eval', arg: `'cip' in $R ? $R.cip : $R.ip`, map: int2ip }
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
