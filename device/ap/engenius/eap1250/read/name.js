module.exports = {
  system: {
    $: 'navigate',
    arg: {
      $: 'eval',
      arg: `window.location.pathname.replace(/(tok=.*admin).*/,'$1')+'/network/wireless_device'`
    },
    values: {
      name: '#cbid\\.system\\.system\\.SystemName'
    }
  }
};
