module.exports = {
  system: {
    keychain: {
      $: 'guard',
      arg: {
        $1: {
          $: 'navigate',
          arg: '/index.html#system'
        },
        $2: {
          oldPassword: {
            $: 'type',
            arg: '#content table:nth-child(2) tr:nth-child(1) input',
            value: { $: 'kv', arg: 'system.keychain.password', options: { original: true } }
          },
          newPassword: {
            $: 'type',
            arg: '#content table:nth-child(2) tr:nth-child(1) input',
            value: { $: 'kv', arg: 'system.keychain.password' }
          },
          rePassword: {
            $: 'type',
            arg: '#content table:nth-child(2) tr:nth-child(1) input',
            value: { $: 'kv', arg: 'system.keychain.password' }
          }
        },
        $3: {
          $: 'click',
          arg: '#content table:nth-child(2) .btn'
        }
      }
    }
  }
}
