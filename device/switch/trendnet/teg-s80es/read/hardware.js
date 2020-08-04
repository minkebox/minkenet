module.exports = {
  system$1: {
    firmware: {
      $: 'fetch',
      arg: `/DS/ConfigBlink.js`,
      values: {
        version: `g_SwitchInfo[1]`
      }
    }
  },
  system$2: {
    $: 'fetch',
    arg: `/DS/Device.js`,
    values: {
      macAddress: {
        0: `g_DeviceInfo[2].toLowerCase()`
      },
      hardware: {
        version: `g_DeviceInfo[0]`
      }
    }
  }
};
