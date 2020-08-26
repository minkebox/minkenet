const hex = (v) => {
  const r = `${v.toString(16)}`;
  return '0x' + `00000000${r}`.substr(-2*Math.ceil(r.length / 2));
}

module.exports = {
  network: {
    physical: {
      port: {
        $: 'guard',
        arg: {
          $: 'fetch',
          arg: '/link.b',
          method: 'post',
          wait: false,
          params: {
            $: 'fn',
            arg: async function() {
              const nm = [];
              const spdc = [];
              let fct = 0;
              let en = 0;
              let an = 0;
              const port = this.readKV('network.physical.port');
              for (let k in port) {
                const key = parseInt(k);
                nm.push(`'${Buffer.from(port[key].name).toString('hex')}'`);
                const bit = 1 << key;
                en |= port[key].enable ? bit : 0;
                fct |= port[key].flowcontrol ? bit : 0;
                switch (port[key].speed) {
                  case '10M':
                    spdc[key] = 0;
                    break;
                  case '100M':
                    spdc[key] = 1;
                    break;
                  case '1G':
                    spdc[key] = 2;
                    break;
                  case 'auto':
                  default:
                    an |= bit;
                    spdc[key] = 0;
                    break;
                }
              }
              return `{en:${hex(en)},nm:[${nm}],an:${hex(an)},spdc:[${spdc.map(v => hex(v))}],dpxc:0x01ff,fctc:${hex(fct)},fctr:${hex(fct)}}`;
            }
          }
        }
      }
    }
  }
};

//{en:0xff,nm:[],an:0x01ff,spdc:[0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00],dpxc:0x01ff,fctc:0x00,fctr:0x00}
