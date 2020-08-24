module.exports = {
  network: {
    igmp: {
      snoop: {
        $: 'oid+set',
        arg: '1.3.6.1.4.1.28866.3.1.11.2.1.1.0',
        map: {
          false: 2,
          true: 1
        }
      }
    }
  }
};
