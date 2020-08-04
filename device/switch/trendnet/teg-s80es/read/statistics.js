module.exports = {
  network: {
    physical: {
      port: {
        $: 'fetch',
        arg: `/DS/Statistics.js`,
        values: {
          $: 'iterate',
          arg: itr => [{
            statistics: {
              rx: {
                packets: `ds_Statistics[${itr.index}][1]`,
                errors: `ds_Statistics[${itr.index}][3]`
              },
              tx: {
                packets: `ds_Statistics[${itr.index}][0]`,
                errors: `ds_Statistics[${itr.index}][2]`
              }
            }
          }]
        }
      }
    }
  }
};
