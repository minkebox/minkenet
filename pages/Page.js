class Page {

  constructor(root, tabs) {
    this.root = root;
    this.send = root.send;
    this.pending = {};
    this.tabs = tabs || {};
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

  tabSelect(tab, arg) {
    if (this.currentTab === this.tabs[tab] || !this.tabs[tab]) {
      return;
    }
    if (this.currentTab) {
      this.currentTab.deselect();
    }
    this.currentTab = this.tabs[tab];
    this.currentTab.select(arg);
  }

  async defaultMsg(msg) {
    if (this.currentTab) {
      const fn = this.currentTab[msg.cmd];
      if (fn) {
        await fn.call(this.currentTab, msg);
      }
    }
  }

  switchPage(pageName, arg) {
    this.root.onMessage['tab.select']({ value: pageName, arg: arg });
  }
}

module.exports = Page;
