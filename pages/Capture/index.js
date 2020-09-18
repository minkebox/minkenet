const Template = require('../Template');
const Page = require('../Page');

class Capture extends Page {

  constructor(send) {
    super(send);
    this.state = {
    };
  }

  select() {
    super.select();
    this.html('main-container', Template.CaptureTab(this.state));
  }

  deselect() {
  }

}

module.exports = Capture;
