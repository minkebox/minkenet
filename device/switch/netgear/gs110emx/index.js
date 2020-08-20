const Device = {

  name: 'GS110EMX',
  id: 'netgear/gs110emx',
  image: require('./image'),

  layout: {
    ports: [
      [ 0, 1, 2, 3, 4, 5, 6, 7, 'S', 8, 'S', 9 ]
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
      ipv4: [ 'dhcp', '192.168.0.239' ],
      loggedOut: {
        $: 'eval',
        arg: 'document.title.indexOf("GS110EMX") !== -1'
      }
    }
  },

  login: {
    path: '/',
    password: '#Password',
    activate: '#button_Login',
    valid: '#gambit'
  },

  constants: {
    system: {
      hardware: {
        manufacturer: 'Netgear',
        model: 'GSX110EMX'
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
            total: 10,
            '1G': 8,
            '10G': 2
          }
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
    $1: require('./write/physical'),
    $2: require('./write/keychain'),
    $3: require('./write/name+ip')
  }

};

module.exports = Device;
