const OID = require('../../../../../OID');

module.exports = {
  system: {
    name: { $: 'oid', arg: OID.system.name },
    location: { $: 'oid', arg: OID.system.location },
    contact: { $: 'oid', arg: OID.system.contact }
  }
};
