module.exports = {
  network: {
    physical: {
      port: {
        $: 'navigate',
        arg: '/userRpm/MibBrowseRpm.htm',
        frame: 'mainFrame',
        type: 'eval',
        values: {
          $: 'iterate',
          arg: itr => [{
            statistics: {
              rx: {
                bytes: `info[1][${itr.index}][3]`,
                packets: `info[1][${itr.index}][1]`
              },
              tx: {
                bytes: `info[1][${itr.index}][4]`,
                packets: `info[1][${itr.index}][2]`
              }
            }
          }]
        }
      }
    }
  }
};
