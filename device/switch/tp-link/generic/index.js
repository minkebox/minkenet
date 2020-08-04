const Device = {

  name: 'Unidentified TP-Link',
  id: 'tplink/unknown',
  type: 'browser',
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
      ipv4: 'dhcp',
      loggedOut: {
        $: 'eval',
        arg: `document.querySelector('#t_corporation').innerText.toLowerCase().indexOf('tp-link') !== -1`
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
