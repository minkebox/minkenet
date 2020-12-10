const OID = require("../../../../../OID");

module.exports = {
  $: 'oid',
  arg: OID.network.physical.$,
  values: {
    network: {
      physical: {
        port: {
          '0': {
            statistics: {
              rx: {
                bytes: `${OID.network.physical.statistics.rx.bytes}.2`,
                unicast: `${OID.network.physical.statistics.rx.unicast}.2`,
                multicast: `${OID.network.physical.statistics.rx.multicast}.2`,
                discarded: `${OID.network.physical.statistics.rx.discarded}.2`,
                errors: `${OID.network.physical.statistics.rx.errors}.2`,
                unknownprotos: `${OID.network.physical.statistics.rx.unknownprotos}.2`
              },
              tx: {
                bytes: `${OID.network.physical.statistics.tx.bytes}.2`,
                unicast: `${OID.network.physical.statistics.tx.unicast}.2`,
                multicast: `${OID.network.physical.statistics.tx.multicast}.2`,
                discarded: `${OID.network.physical.statistics.tx.discarded}.2`,
                errors: `${OID.network.physical.statistics.tx.errors}.2`
              }
            }
          }
        }
      }
    }
  }
};
