const Device = {

  name: 'pfSense Community',
  id: 'pfsense/community',
  type: 'browser',
  image: require('./image'),

  properties: {
    switch: false,
    router: true,
    firewall: true,
    ap: false
  },

  identify: {
    http: {
      ipv4: 'dhcp',
      loggedIn: {
        $: 'eval',
        arg: `document.querySelector("a.navbar-brand span").innerText == 'COMMUNITY EDITION'`
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
