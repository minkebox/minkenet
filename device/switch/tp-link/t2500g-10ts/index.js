const Device = {

  name: 'T2500G-10TS',
  id: 'tplink/t2500g10ts',
  productUrl: 'https://www.tp-link.com/us/business-networking/managed-switch/t2500g-10ts/',
  image: require('./image'),

  layout: {
    ports: [
      [ 0, 1, 2, 3, 4, 5, 6, 7, 'S', 8, 9 ]
    ]
  },

  properties: {
    switch: true
  },

  identify: {
    http: {
      ipv4: [ 'dhcp', '192.168.0.1' ],
      loggedIn: {
        $: 'eval',
        arg: `document.title.toLowerCase().indexOf('t2500g-10ts') !== -1`
      }
    }
  },

  login: require('../generic2/login'),

  constants: {
    system: {
      hardware: {
        manufacturer: 'TP-Link',
        model: 'T2500G-10TS'
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
            total: 10,
            '1G': 8,
            'sfp': 2
          }
        }
      }
    }
  },

  read: {
  },
  write: {
  },
  commit: null

};

module.exports = Device;
