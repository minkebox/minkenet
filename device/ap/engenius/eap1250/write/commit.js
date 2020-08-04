module.exports = {
  $: 'navigate',
  arg: {
    $: 'eval',
    arg: `window.location.pathname.replace(/(tok=.*admin).*/,'$1')+'/uci/changes'`
  },
  values: {
    $: 'click+nav',
    arg: 'input[myid=button_apply]'
  }
};
