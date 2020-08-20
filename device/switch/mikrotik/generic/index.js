const Device = {

  name: 'MikroTik SwOS',
  id: 'mikrotik/unknown',
  image: require('./image'),
  generic: true,

  layout: {
    ports: [
      [ 0 ]
    ]
  },

  properties: {
    switch: true
  },

  identify: {
    http: {
      ipv4: [ 'dhcp', '192.168.88.1' ],
      loggedOut: {
        $: 'eval',
        arg: 'document.title === "MikroTik SwOS"'
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
        model: 'Generic SwOS'
      },
      keychain: {
        username: 'admin',
        password: ''
      },
      ipv4: {
        address: '',
        port: 80
      }
    }
  }
};

module.exports = Device;
