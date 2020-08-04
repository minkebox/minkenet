module.exports = {
  network: {
    igmp: {
      snoop: {
        $: 'fetch',
        frame: 'myframe',
        arg: '/iss/specific/rpc.js',
        method: 'post',
        params: {
          Gambit: {
            $: 'eval',
            arg: 'GetInputGambit()'
          },
          RPC: JSON.stringify({ method: 'CommonGet', id: 0, params: { Template: 'igsSystem' } })
        },
        type: 'jsonp',
        values: {
          $: 'jsonp', arg: `result.igsStatus`, map: { 2: false, 1: true }
        }
      }
    }
  }
};
