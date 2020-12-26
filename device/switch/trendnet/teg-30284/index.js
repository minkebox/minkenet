const Device = {

  name: 'TEG-30284',
  id: 'trendnet/teg-30284',
  image: require('./image'),

  layout: {
    ports: [
      [ 0, 2, 4, 6, 'S', 8, 10, 12, 14, 'S', 16, 18, 20, 22 ],
      [ 1, 3, 5, 7, 'S', 9, 11, 13, 15, 'S', 17, 19, 21, 23, 's', 24, 's', 25, 's', 26, 's', 27 ]
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
        arg: `document.querySelector("#model").innerText == "TEG-30284"`
      }
    }
  },

  login: {
    path: '/',
    username: '#Login',
    password: '#Password',
    activate: '#login_ok',
    valid: {
      $: 'wait',
      arg: '#Gambit',
      frame: 'myframe'
    }
  },

  snmp: {
    version: '2c',
    community: 'private'
  },

  constants: {
    system: {
      hardware: {
        manufacturer: 'TRENDnet',
        model: 'TEG-30284'
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
            total: 28,
            '1G': 24,
            'sfpp': 4
          }
        }
      }
    }
  },

  read: {
    $verify: require('./read/name'),
    $2: require('./read/ip'),
    $3: require('./read/physical'),
    $4: require('./read/igmp'),
    $5: require('./read/vlan'),
    $6: require('./read/lag'),
    $7: require('./read/snmp'),
    $statistics: require('./read/statistics'),
    $8: require('./read/clients'),
    $9: require('./read/mirror'),
    $A: require('./read/limits')
  },
  write: {
    $1: require('./write/snmp'),
    $2: require('./write/name'),
    $3: require('./write/keychain'),
    $4: require('./write/dns'),
    $5: require('./write/lag'),
    $6: require('./write/igmp'),
    $7: require('./write/ivl'),
    $8: require('./write/vlan'),
    $9: require('./write/physical'),
    $A: require('./write/mirror'),
    $B: require('./write/limits'),
    $C: require('./write/ip')
  },
  commit: require('./write/commit')

};

module.exports = Device;
