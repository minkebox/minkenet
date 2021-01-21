module.exports = {
  system: {
    $: 'guard',
    key: 'system.name,system.location,system.contact',
    arg: {
      name: { $: 'oid+set', arg: OID.system.name },
      location: { $: 'oid+set', arg: OID.system.location },
      contact: { $: 'oid+set', arg: OID.system.contact },
    }
  }
};
