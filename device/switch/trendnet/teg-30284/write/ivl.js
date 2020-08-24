module.exports = {
  network: {
    vlans: {
      ivl: {
        $: 'oid+set',
        arg: '1.3.6.1.4.1.28866.3.1.25.1.1.0',
        map: {
          false: 2,
          true: 1
        }
      }
    }
  }
};
