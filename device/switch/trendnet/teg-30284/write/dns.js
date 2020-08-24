module.exports = {
  system: {
    ipv4: {
      dns: {
        $: 'guard',
        arg: {
          $: 'oid+set',
          arg: '1.3.6.1.4.1.28866.3.1.28.1.1.0',
          map: v => Buffer.from(v.split('.'))
        }
      }
    }
  }
};
