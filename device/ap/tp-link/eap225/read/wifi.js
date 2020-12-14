module.exports = {
  network: {
    wireless: {
			station: {
				$: 'fn',
				arg: async ctx => {
					const wifi0 = await ctx.eval({
						$: 'fetch',
						arg: '/data/wireless.ssids.json',
						method: 'post',
						params: {
							radioID: 0,
							operation: 'load'
						},
						values: {
							$: 'iterate',
							limit: 8,
							arg: itr => [{
								enable: { $: 'literal', arg: true },
								ssid: `data[${itr.index}].ssidname`,
								bands: { $: 'literal', arg: '0' },
								vlan: `data[${itr.index}].vlanid`,
								hidden: {
									$: null,
									arg: `data[${itr.index}].ssidbcast`,
									map: {
										1: false,
										0: true
									}
								},
								security: {
									passphrase: `data[${itr.index}].psk_key`
								}
							}]
						}
					});
					const wifi1 = await ctx.eval({
						$: 'fetch',
						arg: '/data/wireless.ssids.json',
						method: 'post',
						params: {
							radioID: 1,
							operation: 'load'
						},
						values: {
							$: 'iterate',
							limit: 8,
							arg: itr => [{
								enable: { $: 'literal', arg: true },
								ssid: `data[${itr.index}].ssidname`,
								bands: { $: 'literal', arg: '1' },
								vlan: `data[${itr.index}].vlanid`,
								hidden: {
									$: null,
									arg: `data[${itr.index}].ssidbcast`,
									map: {
										1: false,
										0: true
									}
								},
								security: {
									passphrase: `data[${itr.index}].psk_key`
								}
							}]
						}
					});
					let nkey = Object.keys(wifi0).length;
					for (let key in wifi1) {
						wifi0[nkey++] = wifi1[key];
					}
					return wifi0;
				}
			}
		}
  }
};
