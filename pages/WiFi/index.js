const Template = require('../Template');
const Page = require('../Page');
const Debounce = require('../../utils/Debounce');

class WiFi extends Page {

  constructor(send) {
    super(send);
    this.state = {
    };
  }

  select() {
    super.select();
    this.html('main-container', Template.WiFiTab(this.state));
  }

  deselect() {
  }
}

module.exports = WiFi;
