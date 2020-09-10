module.exports = {
  system: {
    $: 'fetch',
    arg: '/data/status.device.json?operation=read',
    type: 'jsonp',
    values: {
      name: 'data.deviceName',
      firmware: {
        version: 'data.firmwareVersion'
      },
      hardware: {
        version: { $: 'jsonp', arg: 'data.hardwareVersion', map: v => v }
      },
      macAddress: {
        0: { $: 'jsonp', arg: 'data.mac', map: v => v.replace(/-/g, ':').toLowerCase() }
      },
      ipv4: {
        address: 'data.ip',
        netmask: 'data.subnetMask'
      }
    }
  }
};
