const Device = {

  name: 'pfSense',
  id: 'pfsense/unknown',
  type: 'browser',
  image: require('./image'),
  generic: true,

  properties: {
  },

  identify: {
    http: {
      ipv4: 'dhcp',
      loggedOut: {
        $: 'eval',
        arg: `!!document.querySelector("a[href='https://pfsense.org']")`
      }
    }
  },

  login: {
    path: '/',
    username: {
      select: '#usernamefld'
    },
    password: {
      select: '#passwordfld'
    },
    activate: {
      $: 'click',
      select: `input[name=login]`
    }
  }
};

module.exports = Device;
