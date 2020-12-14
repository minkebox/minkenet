module.exports = {

  convert(val) {
    const a = {};
    val.split('\n').forEach(line => {
      const p = line.replace('\r', '').split(' ');
      let k = null;
      let v = null;
      if (p.length === 2) {
        k = p[0];
        v = p[1];
      }
      else if (p.length === 3) {
        k = `${p[0]}_${p[1]}`;
        v = p[2];
      }
      if (k) {
        while (k in a) {
          k = `${k}_`;
        }
        a[k] = v;
      }
    });
    return a;
  }

};
