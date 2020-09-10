module.exports = {
  system: {
    name: {
      $: 'guard',
      arg: {
        $1: {
          $: 'frame',
          frame: 'maincontent',
          arg: {
            $0: {
              $: 'navigate',
              arg: '/switch_info.cgi'
            },
            $1: {
              $: 'type',
              arg: `#switch_name`
            }
          }
        },
        $2: {
          $: 'click',
          arg: '#btn_Apply'
        }
      }
    }
  }
};
