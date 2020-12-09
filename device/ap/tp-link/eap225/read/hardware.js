module.exports = {
  system: {
    $: 'fetch',
    arg: '/data/status.device.json?operation=read',
    type: 'jsonp',
    values: {
      firmware: {
        version: 'data.firmwareVersion'
      },
      hardware: {
        version: { $: 'jsonp', arg: 'data.hardwareVersion', map: v => v }
      }
    }
  }
};
