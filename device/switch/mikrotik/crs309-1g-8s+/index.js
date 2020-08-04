const Device = {

  name: 'CRS309-1G-8S+',
  id: 'mikrotik/crs309-1g-8s+',
  type: 'browser',
  image: require('./image'),

  layout: {
    ports: [
      [ 0, 's', 1, 's', 2, 's', 3, 's', 4, 's', 5, 's', 6, 's', 7, 'S', 8 ]
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
        type: 'eval+r',
        values: {
          $: 'eval',
          arg: '$R.brd',
          equals: '4352533330392d31472d38532b' // CRS309-1G-8S+
        }
      }
    },
    mndp: {
      txt: {
        board: 'CRS309-1G-8S+'
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
        model: 'CRS309-1G-8S+'
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
            total: 9,
            '1G': 1,
            '10G': 8
          }
        }
      }
    }
  },

  read: {
    $1: require('../generic/read/name+ip'),
    $2: require('../generic/read/physical'),
    $3: require('../generic/read/vlan'),
    $4: require('../generic/read/clients'),
    $statistics: require('../generic/read/statistics')
  },
  write: {
    $1: require('../generic/write/name'),
    $2: require('../generic/write/keychain'),
    $3: require('../generic/write/physical'),
    $4: require('../generic/write/ip')
  }

};

module.exports = Device;
