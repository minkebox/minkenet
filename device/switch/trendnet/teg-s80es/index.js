const Device = {

  name: 'TEG-S80ES',
  id: 'trendnet/teg-s80es',
  image: require('./image'),

  layout: {
    ports: [
      [ 0, 1, 2, 3, 4, 5, 6, 7 ]
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
      ipv4: [ 'dhcp', '192.168.10.200' ],
      loggedOut: {
        $: 'eval',
        arg: `document.querySelector("#model").innerText == "TEG-S80ES"`
      }
    }
  },

  login: {
    path: '/',
    username: '#Login',
    password: '#Password',
    activate: '#login_ok',
    valid: '#myframe'
  },

  constants: {
    system: {
      hardware: {
        manufacturer: 'TRENDnet',
        model: 'TEG-S80ES'
      },
      keychain: {
        username: 'admin',
        password: 'admin'
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
            total: 8,
            '1G': 8
          }
        }
      }
    }
  },

  read: {
    $1: require('./read/name'),
    $2: require('./read/hardware'),
    $3: require('./read/ip'),
    $4: require('./read/physical'),
    $5: require('./read/igmp'),
    $6: require('./read/vlan'),
    $7: require('./read/lag'),
    $8: require('./read/clients'),
    $statistics: require('./read/statistics'),
  },
  write: {
    $1: require('./write/name'),
    $2: require('./write/keychain'),
    $3: require('./write/igmp'),
    $4: require('./write/lag'),
    $5: require('./write/vlan'),
    $6: require('./write/ip'),
    $7: require('./write/physical')
  },
  commit: require('./write/commit')

};

module.exports = Device;
