const Device = {

  name: 'EAP1250',
  id: 'engenius/eap1250',
  type: 'browser',
  image: require('./image'),

  layout: {
    ports: [
      [ 'SS', 0 ],
    ]
  },

  properties: {
    switch: false,
    router: false,
    firewall: false,
    ap: true
  },

  identify: {
    mdns: {
      txt: {
        modelName: 'EAP1250'
      }
    },
    http: {
      ipv4: 'dhcp',
      loggedOut: {
        $: 'selector',
        arg: `title`,
        equals: `EAP1250`
      }
    }
  },

  login: {
    path: '/',
    username: '#account',
    password: '#password_plain_text',
    activate: {
      $: 'eval',
      arg: `document.querySelector('img[myid=login]').onclick()`
    },
    valid: 'div[myid=logout]'
  },

  constants: {
    system: {
      hardware: {
        manufacturer: 'EnGenius',
        model: 'EAP1250'
      },
      keychain: {
        username: 'admin',
        password: 'admin'
      },
      ipv4: {
        address: '',
        port :80
      }
    },
    network: {
      physical: {
        ports: {
          nr: {
            total: 1,
            '1G': 1
          }
        }
      }
    }
  },

  read: {
    $1: require('./read/name'),
    $2: require('./read/mac+physical'),
    $3: require('./read/ip+clients'),
    $4: require('./read/lag'),
    $statistics: require('./read/statistics')
  },
  write: {
    $1: require('./write/name')
  },
  commit: require('./write/commit')

};

module.exports = Device;
