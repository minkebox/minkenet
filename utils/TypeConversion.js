module.exports = {

  toBoolean: function(value) {
    if (String(value).toLowerCase() === 'true') {
      return true;
    }
    return false;
  },

  toNumber: function(value) {
    return Number(value);
  },

  toString: function(value) {
    if (value === undefined || value === null) {
      return value;
    }
    return String(value);
  },

  toNatural: function(value) {
    if (typeof value !== 'string') {
      return value;
    }
    value = value.trim();
    const lsvalue = String(value).toLowerCase();
    if (lsvalue === 'true') {
      return true;
    }
    if (lsvalue === 'false') {
      return false;
    }
    if (lsvalue === '') {
      return '';
    }
    const nvalue = Number(value);
    if (Number.isFinite(nvalue)) {
      return nvalue;
    }
    return value;
  }
}
