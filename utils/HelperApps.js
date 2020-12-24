const FS = require('fs');

const Apps = {
  ping: [ '/bin/ping' ],
  arp: [ '/usr/sbin/arp', '/sbin/arp' ],
  ip: [ '/bin/ip', '/sbin/ip' ]
};

for (let app in Apps) {
  const options = Apps[app];
  Apps[app] = null;
  for (let i = 0; i < options.length; i++) {
    if (FS.existsSync(options[i])) {
      Apps[app] = options[i];
      break;
    }
  }
}

module.exports = Apps;
