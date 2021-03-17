module.exports = {
  system: {
    ipv4: {
      $: 'guard',
      arg: {
        $: 'fetch',
        arg: '/sys.b',
        method: 'post',
        wait: 0.1,
        params: {
          $: 'fn',
          arg: async function() {
            const mode = this.readKV('system.ipv4.mode') === 'static' ? 1 : 0;
            const ip = this.readKV('system.ipv4.address').split('.').reduce((ipInt, octet) => (ipInt << 8) + parseInt(octet), 0) >>> 0;
            return `{iptp:0x0${mode},sip:0x${ip}}`;
          }
        }
      }
    }
  }
};
