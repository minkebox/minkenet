module.exports = {
  network: {
    clients: {
      $: 'fetch',
      arg: '/data/status.client.user.json?operation=load',
      values: {
        $: 'iterate',
        arg: itr => [{
          mac: { $: null, arg: `data.${itr.index}.MAC`, map: mac => mac.replace(/-/g,':').toLowerCase() },
          ssid: `data.${itr.index}.SSID`,
          ip: `data.${itr.index}.IP`,
          hostname: `data.${itr.index}.hostname`
        }]
      }
    }
  }
};
