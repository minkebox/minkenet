module.exports = {
  network: {
    igmp: {
      snoop: {
        $: 'oid',
        arg: '1.3.6.1.4.1.28866.3.1.11.2.1.1.0',
        map: {
          2: false,
          1: true
        }
      }
    }
  }
};
