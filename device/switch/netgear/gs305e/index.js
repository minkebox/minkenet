const Device = {

  name: 'GS305E',
  id: 'netgear/gs305e',
  type: 'browser',
  image: require('./image'),

  layout: {
    ports: [
      [ 0, 1, 2, 3, 4 ]
    ]
  },

  properties: {
    switch: true,
    router: false,
    firewall: false,
    ap: false
  },

  identify: {
    http: {
      ipv4: 'dhcp',
      loggedOut: {
        $: 'eval',
        arg: 'document.title.indexOf("GS305E") !== -1'
      }
    },
    nsdp: {
      txt: {
        model: 'GS305E'
      }
    }
  },

  login: {
    path: '/',
    password: '#password',
    activate: '#loginBtn',
    valid: '#System'
  },

  constants: {
    system: {
      hardware: {
        manufacturer: 'Netgear',
        model: 'GS305E'
      },
      keychain: {
        password: 'password'
      },
      ipv4: {
        address: '',
        port: 80
      }
    },
    network: {
      physical: {
        ports: {
          nr: {
            total: 5,
            '1G': 5
          }
        }
      },
      lags: {
        types: {
          static: 0,
          active: 0
        }
      }
    }
  },

  read: {
    $1: require('./read/name+ip'),
    $2: require('./read/physical'),
    $3: require('./read/igmp'),
    $4: require('./read/vlan'),
    $5: require('./read/lag'),
    $statistics: require('./read/statistics')
  },
  write: {
    $1: require('./write/name'),
    $2: require('./write/keychain'),
    $3: require('./write/igmp'),
    $4: require('./write/vlan'),
    $5: require('./write/physical'),
    $6: require('./write/ip')
  }

};

module.exports = Device;
