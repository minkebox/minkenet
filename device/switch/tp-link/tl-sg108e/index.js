const Device = {

  name: 'TL-SG108E',
  id: 'tplink/tlsg108e',
  type: 'browser',
  image: require('./image'),

  layout: {
    ports: [
      [ 0, 1, 2, 3, 4, 5, 6, 7 ]
    ]
  },

  properties: {
    switch: true
  },

  identify: {
    http: {
      ipv4: 'dhcp',
      loggedIn: {
        $: 'eval',
        arg: `top.g_title === 'TL-SG108E'`
      }
    },
    escp: {
      txt: {
        model: 'TL-SG108E'
      }
    }
  },

  login: require('../generic/login'),

  constants: {
    system: {
      hardware: {
        manufacturer: 'TP-Link',
        model: 'TL-SG108E'
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
    $5: require('./write/lag'),
    $6: require('./write/physical'),
    $7: require('./write/ip')
  }

};

module.exports = Device;
