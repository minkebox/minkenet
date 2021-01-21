// Helper and common maps

const TypeConversion = require('./utils/TypeConversion');

module.exports = {

  Null: v => v,

  toMacAddress: mac => mac.replace(/-/g,':').toLowerCase(),

  toHex: v => `0x${v.toString(16)}`,

  toHex2: v => {
    const r = `${v.toString(16)}`;
    return '0x' + `0${r}`.substr(-2*Math.ceil(r.length / 2));
  },

  intToIPAddress: ip32 => {
    let ip = ip32 % 256;
    for (let i = 3; i > 0; i--) {
      ip32 = Math.floor(ip32 / 256);
      ip = `${ip}.${ip32 % 256}`;
    }
    return ip;
  },

  toNatural: TypeConversion.toNatural

};
