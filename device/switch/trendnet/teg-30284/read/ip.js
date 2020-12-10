const OID = require("../../../../../OID");

module.exports = {
  system: {
    ipv4$1: {
      $: 'oid',
      arg: '1.3.6.1.4.1.28866.3.1.16.3',
      values: {
        mode: {
          $: 'jsonp',
          arg: '1.3.6.1.4.1.28866.3.1.16.3.1.0',
          map: {
            1: 'static',
            2: 'dhcp'
          }
        },
        address: '1.3.6.1.4.1.28866.3.1.16.3.2.0',
        netmask: '1.3.6.1.4.1.28866.3.1.16.3.3.0',
        gateway: '1.3.6.1.4.1.28866.3.1.16.3.4.0'
      }
    },
    ipv4$2: {
      dns: {
        $: 'oid',
        arg: '1.3.6.1.4.1.28866.3.1.28.1.1.0',
        map: OID.toMacAddress
      }
    }
  }
};
