module.exports = {
  system: {
    $: 'fetch',
    arg: '/data/lan.json',
    type: 'jsonp',
    values: {
      ipv4: {
        mode: {
          $: 'jsonp',
          arg: 'data.connType',
          map: {
            dynamic: 'dhcp',
            static: 'static'
          }
        },
        gateway: { $: 'jsonp', arg: 'data.fallbackGateway', fallback: '' }
      }
    }
  }
}
