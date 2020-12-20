const Device = {

  name: 'CSS106-5G-1S',
  id: 'mikrotik/css106-5g-1s',
  image: require('./image'),

  layout: {
    ports: [
      [ 0, 1, 2, 3, 4 ],
      [ 'S', 'S', 5 ]
    ]
  },

  properties: {
    switch: true
  },

  identify: {
    http: {
      loggedIn: {
        $: 'fetch',
        arg: '/sys.b',
        transform: v => `$R=${v}`,
        type: 'eval',
        values: {
          $: 'eval',
          arg: '$R.brd',
          equals: '4353533130362d35472d3153' // CSS106-5G-1S
        }
      }
    },
    mndp: {
      txt: {
        board: 'CSS106-5G-1S'
      }
    }
  },

  basicAuth: {
    path: '/index.html'
  },

  constants: {
    system: {
      hardware: {
        manufacturer: 'Mikrotik',
        model: 'CSS106-5G-1S'
      },
      keychain: {
        username: 'admin',
        password: ''
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
            total: 6,
            '1G': 5,
            'sfp': 1
          }
        }
      }
    }
  },

  read: {
    $verify: require('../generic/read/name+ip'),
    $2: require('../generic/read/physical'),
    $3: require('../generic/read/vlan'),
    $4: require('../generic/read/clients'),
    $5: require('./read/lag'),
    $statistics: require('../generic/read/statistics'),
    $6: require('../generic/read/mirror')
  },
  write: {
    $1: require('../generic/write/name'),
    $2: require('../generic/write/keychain'),
    $3: require('../generic/write/physical'),
    $4: require('../generic/write/vlan'),
    $5: require('../generic/write/ivl'),
    $6: require('../generic/write/igmp'),
    $7: require('../generic/write/mirror'),
    $8: require('../generic/write/ip')
  }

};

module.exports = Device;
