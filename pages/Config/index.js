const Template = require('../Template');
const ConfigDB = require('../../Config');
const Page = require('../Page');

class Config extends Page {

  select() {
    super.select();
    this.html('main-container', Template.ConfigTab(ConfigDB.readAll()));
  }

  async 'config.change' (msg) {
    ConfigDB.write(msg.value.key, msg.value.value);
  }

}

module.exports = Config;
