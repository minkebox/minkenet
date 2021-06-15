const Device = {

  name: 'TL-SG105PE',
  id: 'tplink/tlsg105pe',
  image: require('./image'),

  layout: {
    ports: [
      [ 0, 1, 2, 3, 4 ]
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
        arg: `top.g_title === 'TL-SG105PE'`
      }
    },
    escp: {
      txt: {
        model: 'TL-SG105PE'
      }
    }
  },

  login: require('../generic1/login'),

  constants: {
    system: {
      hardware: {
        manufacturer: 'TP-Link',
        model: 'TL-SG105PE'
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
            total: 5,
            '1G': 5
          }
        }
      }
    }
  },

  read: {
    $verify: require('../tl-sg108e/read/name+ip'),
    $2: require('../tl-sg108e/read/physical'),
    $3: require('../tl-sg108e/read/igmp'),
    $4: require('../tl-sg108e/read/vlan'),
    $5: require('../tl-sg108e/read/lag'),
    $statistics: require('../tl-sg108e/read/statistics'),
    $6: require('../tl-sg108e/read/mirror'),
    $7: require('../tl-sg108e/read/limits')
  },
  write: {
    $1: require('../tl-sg108e/write/name'),
    $2: require('../tl-sg108e/write/keychain'),
    $3: require('../tl-sg108e/write/igmp'),
    $4: require('../tl-sg108e/write/vlan'),
    $5: require('../tl-sg108e/write/lag'),
    $6: require('../tl-sg108e/write/physical'),
    $7: require('../tl-sg108e/write/mirror'),
    $8: require('../tl-sg108e/write/limits'),
    $9: require('../tl-sg108e/write/ip')
  },
  commit: require('../tl-sg108e/write/commit')

};

module.exports = Device;
