const Device = {

  name: 'EAP1250',
  id: 'engenius/eap1250',
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
      },
      wireless: {
        radios: {
          nr: {
            total: 2,
            '2_4ghz': 1,
            '5ghz': 1
          }
        },
        stations: {
          nr: {
            total: 8,
            '2.4GHz': 0,
            '5GHz': 0,
            '2.4GHz/5GHz': 8
          }
        }
      }
    }
  },

  read: {
    $1: require('./read/name+version'),
    $2: require('./read/mac+physical'),
    $3: require('./read/ip+clients'),
    $4: require('./read/lag'),
    $statistics: require('./read/statistics')
  },
  write: {
    $1: require('./write/name'),
    $2: require('./write/keychain')
  },
  commit: require('./write/commit')

};

module.exports = Device;
