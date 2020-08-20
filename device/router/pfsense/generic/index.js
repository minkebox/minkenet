const Device = {

  name: 'pfSense',
  id: 'pfsense/unknown',
  image: require('./image'),
  generic: true,

  properties: {
    router: true,
    firewall: true
  },

  identify: {
    http: {
      ipv4: [ 'dhcp' ],
      loggedOut: {
        $: 'eval',
        arg: `!!document.querySelector("a[href='https://pfsense.org']")`
      }
    }
  },

  login: {
    path: '/',
    username: '#usernamefld',
    password: '#passwordfld',
    activate: `input[name=login]`,
    valid: ''
  },

  constants: {
    system: {
      hardware: {
        model: 'Generic pfSense'
      },
      keychain: {
        username: 'admin',
        password: 'pfsense'
      },
      ipv4: {
        address: '',
        port: 80
      }
    }
  }
};

module.exports = Device;
