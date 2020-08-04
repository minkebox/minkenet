class Page {

  constructor(sendOrTabs) {
    if (typeof sendOrTabs === 'function') {
      this.send = sendOrTabs;
      this.pending = {};
      this.tabs = {};
    }
    else {
      this.tabs = sendOrTabs;
    }
    this.currentTab = null;
  }

  html(id, text) {
    const pending = this.pending[id] || (this.pending[id] = {});
    if (pending.text !== text) {
      clearTimeout(pending.timeout);
      pending.text = text;
      pending.timeout = setTimeout(() => {
        this.send('html.update', { id: id, html: text });
        const mid = `id="${id}"`;
        for (let key in this.pending) {
          const kid = `id="${key}"`;
          if (this.pending[key].text !== null && (text.indexOf(kid) !== -1 || this.pending[key].text.indexOf(mid) !== -1)) {
            this.pending[key].text = null;
          }
        }
      });
    }
  }

  async select() {
    this.pending = {};
  }

  async reselect() {
  }

  async deselect() {
    if (this.currentTab) {
      this.currentTab.deselect();
      this.currentTab = null;
    }
  }

  tabSelect(tab) {
    if (this.currentTab === this.tabs[tab] || !this.tabs[tab]) {
      return;
    }
    if (this.currentTab) {
      this.currentTab.deselect();
    }
    this.currentTab = this.tabs[tab];
    this.currentTab.select();
  }

  async defaultMsg(msg) {
    if (this.currentTab) {
      const fn = this.currentTab[msg.cmd];
      if (fn) {
        await fn.call(this.currentTab, msg);
      }
    }
  }
}

module.exports = Page;
