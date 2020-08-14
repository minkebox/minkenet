module.exports = function(fn, lk) {
  if (!lk) {
    lk = fn;
  }
  return async function() {
    const self = this;
    const args = arguments;
    async function exec() {
      try {
        return await fn.apply(self, args);
      }
      finally {
        const next = lk.__barrier.shift();
        if (next) {
          setImmediate(next);
        }
        else {
          lk.__barrier = null;
        }
      }
    }
    if (!lk.__barrier) {
      lk.__barrier = [];
      return await exec();
    }
    else {
      return new Promise((resolve, reject) => {
        lk.__barrier.push(async () => {
          try {
            resolve(await exec());
          }
          catch (e) {
            reject(e);
          }
        });
      });
    }
  }
}
