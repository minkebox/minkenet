module.exports = {
  system: {
    name: { $: 'oid', arg: OID.system.name },
    location: { $: 'oid', arg: OID.system.location },
    contact: { $: 'oid', arg: OID.system.contact },
    firmware: {
      version: { $: 'oid', arg: '1.3.6.1.4.1.28866.3.1.16.1.2.0' }
    },
    macAddress: {
      0: {
        $: 'oid',
        arg: '1.3.6.1.4.1.28866.3.1.16.2.1.0',
        map: OID.toMacAddress
      }
    }
  }
};
