module.exports = {
  system: {
    $: 'guard',
    key: 'system.snmp.enable,system.contact,system.location',
    arg: {
      $: 'fetch',
      arg: '/snmp.b',
      method: 'post',
      params: {
        $: 'fn',
        arg: ctx => {
          const enable = ctx.readKV('system.snmp.enable') ? '0x01' : '0x00';
          const location = Buffer.from(ctx.readKV('system.location')).toString('hex');
          const contact = Buffer.from(ctx.readKV('system.contact')).toString('hex');
          return `{en:${enable},loc:'${location}',ci:'${contact}'}`;
        }
      }
    }
  }
};
