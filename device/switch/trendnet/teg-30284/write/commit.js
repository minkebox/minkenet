module.exports = {
  $: 'fetch',
  arg: '/iss/specific/rpc.js',
  frame: 'myframe',
  method: 'post',
  params: {
    Gambit: {
      $: 'eval',
      arg: 'GetInputGambit()'
    },
    RPC: {
      $: 'tojson',
      arg: {
        method: 'CommonSet',
        id: 0,
        params: {
          Template: 'sysConfig',
          configOper: '3'
        }
      }
    }
  }
};
