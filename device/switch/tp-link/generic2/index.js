const Device = {

  name: 'Unknown TP-Link',
  id: 'tplink/unknown',
  image: require('../generic1/image'),
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
      ipv4: [ 'dhcp', '192.168.0.1' ],
      loggedOut: {
        $: 'eval',
        arg: `document.querySelector('.icon-logo').innerText.toLowerCase().indexOf('tp-link') !== -1`
      }
    }
  },

  login: require('./login'),

  constants: {
    system: {
      hardware: {
        manufacturer: 'TP-Link',
        model: 'Generic'
      },
      keychain: {
        username: 'admin',
        password: 'admin'
      },
      ipv4: {
        address: '',
        port: 80
      }
    }
  },
};

module.exports = Device;
