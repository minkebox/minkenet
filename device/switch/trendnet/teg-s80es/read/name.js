module.exports = {
  system: {
    $: 'fetch',
    arg: `/DS/sys.js`,
    values: {
      name: `ds_SysInfo[0]`,
      location: `ds_SysInfo[1]`,
      contact: `ds_SysInfo[2]`
    }
  }
};
