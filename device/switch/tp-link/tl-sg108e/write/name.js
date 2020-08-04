module.exports = {
  system: {
    name: {
      $: `guard`,
      arg: {
        $: `fetch`,
        arg: `/system_name_set.cgi`,
        params: {
          sysName: { $: `kv` }
        }
      }
    }
  }
};
