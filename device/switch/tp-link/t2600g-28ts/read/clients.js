module.exports = {
  network: {
    clients: {
      $: 'navigate',
      arg: '/userRpm/AddressFormDisplayRpm.htm',
      frame: 'mainFrame',
      type: 'eval',
      values: {
        $: 'iterate',
        arg: itr => [{
          mac: {
            $: 'eval',
            arg: `Info[1][${itr.index}][0]`,
            map: Maps.toMacAddress
          },
          vlan: `Info[1][${itr.index}][1]`,
          portnr: {
            $: 'eval',
            arg: `Info[1][${itr.index}][2]`,
            map: p => p.split('/')[2] - 1
          }
        }]
      }
    }
  }
};
