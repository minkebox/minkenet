const Device = {

  name: 'EAP225-Outdoor',
  id: 'tplink/eap225-outdoor',
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
    http: {
      ipv4: [ 'dhcp', '192.168.0.254' ],
      loggedOut: {
        $: 'selector',
        arg: `#devname`,
        equals: `EAP225-Outdoor`
      }
    },
    omada: {
      txt: {
        model: 'EAP225-Outdoor'
      }
    }
  },

  login: {
    path: '/',
    username: {
      $: 'set',
      arg: '#login-username'
    },
    password: {
      $: 'set',
      arg: '#login-password'
    },
    activate: '#login-btn',
    valid: '#device_name'
  },

  snmp: {
    version: '2c',
    community: 'private'
  },

  constants: {
    system: {
      hardware: {
        manufacturer: 'TP-Link',
        model: 'EAP225-Outdoor'
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
            total: 16,
            '2_4ghz': 8,
            '5ghz': 8,
            '2_4ghz+5ghz': 0
          }
        }
      }
    }
  },

  read: {
    $verify: require('../eap225/read/hardware'),
    $2: require('../eap225/read/name'),
    $3: require('../eap225/read/ip'),
    $4: require('../eap225/read/physical'),
    $statistics: require('../eap225/read/statistics'),
    $5: require('../eap225/read/radios'),
    $6: require('../eap225/read/wifi'),
    $7: require('../eap225/read/clients')
  },
  write: {
    $1: require('../eap225/write/snmp'),
    $2: require('../eap225/write/name')
  },
  commit: null

};

module.exports = Device;
