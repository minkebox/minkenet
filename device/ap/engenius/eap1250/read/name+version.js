module.exports = {
  system: {
    $: 'navigate',
    arg: {
      $: 'eval',
      arg: `window.location.pathname.replace(/(tok=.*admin).*/,'$1')+'/status/overview'`
    },
    values: {
      name: '[myid=Device_Name_text]',
      firmware: {
        version: '[myid=fw_ver_text]'
      },
      hardware: {
        version: {
          $: 'selector',
          arg: '#dev_info .title-option:nth-child(12) td:last-child',
          map: x => x
        }
      }
    }
  }
};
