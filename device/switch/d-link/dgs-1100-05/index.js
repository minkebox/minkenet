const Device = {

  name: 'DGS-1100-05',
  id: 'dlink/dgs-1100-05',
  image: require('./image'),

  layout: {
    ports: [
      [ 'S', 0, 1, 2, 3, 4 ]
    ]
  },

  properties: {
    switch: true
  },

  identify: {
    http: {
      ipv4: [ 'dhcp', '10.90.90.90' ],
      loggedOut: {
        $: 'eval',
        arg: `g_SwitchInfo[0] === 'DGS-1100-05'`
      }
    },
    ddp: {
      txt: {
        product: 'DGS-1100-05'
      }
    }
  },

  login: {
    path: '/',
    password: {
      $: 'type',
      frame: 0,
      arg: '#pass'
    },
    activate: {
      $: 'click',
      frame: 0,
      arg: 'input[value=OK]'
    },
    valid: {
      $: 'eval',
      arg: `frames.length === 3`
    }
  },

  constants: {
    system: {
      hardware: {
        manufacturer: 'D-Link',
        model: 'DGS-1100-05'
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
            total: 5,
            '1G': 5
          }
        }
      }
    }
  },

  read: {
    $1: require('./read/name+ip'),
    $2: require('./read/physical'),
    $3: require('./read/vlan'),
    $4: require('./read/igmp'),
    $5: require('./read/clients'),
    $6: require('./read/lag'),
    $7: require('./read/snmp'),
    $statistics: require('./read/statistics')
  },
  write: {
    $1: require('./write/snmp'),
    $2: require('./write/name'),
    $3: require('./write/keychain'),
    $4: require('./write/igmp'),
    $5: require('./write/lag'),
    $6: require('./write/vlan'),
    $7: require('./write/physical'),
    $8: require('./write/ip')
  },
  commit: require('./write/commit')

};

module.exports = Device;
