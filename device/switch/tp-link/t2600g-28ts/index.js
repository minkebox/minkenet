const Device = {

  name: 'T2600G-28TS',
  id: 'tplink/t2600g28ts',
  productUrl: 'https://www.tp-link.com/us/business-networking/managed-switch/t2600g-28ts/',
  image: require('./image'),

  layout: {
    ports: [
      [ 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23 ],
      [ 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 'S', 24, 25, 26, 27 ]
    ]
  },

  properties: {
    switch: true
  },

  identify: {
    http: {
      ipv4: '192.168.0.1',
      loggedIn: {
        $: 'eval',
        arg: `top.g_title === 'T2600G-28TS'`
      }
    }
  },

  login: require('../generic/login'),

  constants: {
    system: {
      hardware: {
        manufacturer: 'TP-Link',
        model: 'T2600G-28TS'
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
            'sfp': 4
          }
        }
      }
    }
  },

  read: {
    $1: require('./read/name+physical'),
    $2: require('./read/ip'),
    $3: require('./read/vlan'),
    $4: require('./read/lag'),
    $5: require('./read/clients'),
    $6: require('./read/snmp'),
    $7: require('./read/igmp'),
    $statistics: require('./read/statistics'),
    $8: require('./read/slow-statistics')
  },
  write: {
    $1: require('./write/snmp'),
    $2: require('./write/name'),
    $3: require('./write/ip'),
    $4: require('./write/physical'),
    $5: require('./write/keychain')
  },
  commit: require('./write/commit')

};

module.exports = Device;
