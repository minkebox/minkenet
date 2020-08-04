module.exports = {
  system: {
    name: {
      $: 'guard',
      arg: {
        $0: {
          $: 'frame',
          frame: 'maincontent',
          arg: {
            $0: {
              $: 'navigate',
              arg: {
                $: 'eval',
                arg: `"/iss/specific/sysInfo.html?Gambit=" + top.GAMBIT`
              }
            },
            $1: {
              $: 'set',
              arg: `#tbl1 input[name=switch_name]`
            }
          }
        },
        $1: {
          $: 'click',
          arg: '#btn_Apply',
        }
      }
    }
  }
};
