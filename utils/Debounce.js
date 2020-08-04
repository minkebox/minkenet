module.exports = (fn, self, timeout) => {
  let timer = null;
  return function() {
    const args = arguments;
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(function() {
      fn.apply(self, args);
    }, timeout || 0);
  };
};
