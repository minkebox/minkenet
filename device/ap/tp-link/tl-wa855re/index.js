const Device = {

  name: 'TL-WA855RE',
  id: 'tplink/tl-wa855re',
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
        arg: `.page-title .text-wrap-display`,
        equals: `TL-WA855RE`
      }
    }
  },

  login: {
    path: '/',
    password: {
      $: 'set',
      arg: '.password-text.password-hidden'
    },
    activate: 'a[title="LOG IN"]',
    valid: '#navigator'
  },

  constants: {
    system: {
      hardware: {
        manufacturer: 'TP-Link',
        model: 'TL-WA855RE'
      },
      keychain: {
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
            total: 1,
            '2_4ghz': 1
          }
        },
        stations: {
          nr: {
            total: 1,
            '2_4ghz': 1,
            '5ghz': 0,
            '2_4ghz+5ghz': 0
          }
        }
      }
    }
  },

  read: {
    $1: require('./read/ip')
  },
  write: {
  },
  commit: null

};

module.exports = Device;
