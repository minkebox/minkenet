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
									mode: {
										$: 'fn',
										arg: async ctx => {
											const s = await ctx.eval('jsonp', `data[${itr.index}].securityMode`);
											const v = await ctx.eval('jsonp', `data[${itr.index}].psk_version`);
											const c = await ctx.eval('jsonp', `data[${itr.index}].psk_cipher`);
											return `${s}:${v}:${c}`;
										},
										map: {
											'0:3:1': 'none',
											'3:1:1': 'wpa/psk/tkip/aes',
											'3:2:1': 'wpa2/psk/tkip/aes',
											'3:3:1': 'wpa/wpa2/psk/tkip/aes',
											'3:1:2': 'wpa/psk/tkip',
											'3:2:2': 'wpa2/psk/tkip',
											'3:3:2': 'wpa/wpa2/psk/tkip',
											'3:1:3': 'wpa/psk/aes',
											'3:2:3': 'wpa2/psk/aes',
											'3:3:3': 'wpa/wpa2/psk/aes'
										}
									},
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
									mode: {
										$: 'fn',
										arg: async ctx => {
											const s = await ctx.eval('jsonp', `data[${itr.index}].securityMode`);
											const v = await ctx.eval('jsonp', `data[${itr.index}].psk_version`);
											const c = await ctx.eval('jsonp', `data[${itr.index}].psk_cipher`);
											return `${s}:${v}:${c}`;
										},
										map: {
											'0:3:1': 'none',
											'3:1:1': 'wpa/psk/tkip/aes',
											'3:2:1': 'wpa2/psk/tkip/aes',
											'3:3:1': 'wpa/wpa2/psk/tkip/aes',
											'3:1:2': 'wpa/psk/tkip',
											'3:2:2': 'wpa2/psk/tkip',
											'3:3:2': 'wpa/wpa2/psk/tkip',
											'3:1:3': 'wpa/psk/aes',
											'3:2:3': 'wpa2/psk/aes',
											'3:3:3': 'wpa/wpa2/psk/aes'
										}
									},
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
