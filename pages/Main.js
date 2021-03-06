const DeviceInstanceManager = require('../DeviceInstanceManager');
const Template = require('./Template');
const Page = require('./Page');
const DevicesTab = require('./Device');
const NetworksTab = require('./Network');
const LinksTab = require('./Link');
const ClientsTab = require('./Clients');
const ConfigAdoptionTab = require('./Config/Adoption');
const ConfigMonitorTab = require('./Config/Monitor');
const ConfigOtherTab = require('./Config/Other');
const VizTab = require('./Viz');
const WiFiTab = require('./WiFi');
const CaptureTab = require('./Capture');
const Debounce = require('../utils/Debounce');
const Log = require('debug')('ui');

async function HTML(ctx) {
  Template.load();
  ctx.body = Template.Main({
    device: DeviceInstanceManager.getAllDevices()
  });
  ctx.type = 'text/html';
}

async function WS(ctx) {

  const q = [];

  function send(cmd, value) {
    try {
      ctx.websocket.send(JSON.stringify({
        cmd: cmd,
        value: value
      }));
    }
    catch (_) {
      Log(_);
    }
  }
  send.bufferedAmount = function() {
    return ctx.websocket.bufferedAmount;
  }

  const pending = {};
  const html = (id, text) => {
    clearTimeout(pending[id]);
    if (typeof text === 'string') {
      pending[id] = setTimeout(() => {
        send('html.update', { id: id, html: text });
      }, 10);
    }
  }

  const State = {
    send: send,
    current: null,
    commitState: null,
    onMessage: {},
    common: {
      device: null,
      portnr: null
    }
  };
  State.tabs = {
    overview: new VizTab(State),
    devices: new DevicesTab(State),
    networks: new Page(State, { vlans: new NetworksTab(State), links: new LinksTab(State), wifi: new WiFiTab(State), capture: new CaptureTab(State) }),
    clients: new ClientsTab(State),
    config: new Page(State, { adoption: new ConfigAdoptionTab(State), monitor: new ConfigMonitorTab(State), other: new ConfigOtherTab(State) })
  };
  State.current = State.tabs.overview,
  State.current.select();

  const updateCommitUI = Debounce(() => {
    const cstate = DeviceInstanceManager.commitState();
    if (cstate !== State.commitState) {
      State.commitState = cstate;
      html('commit-revert-buttons', Template.CRButtons({
        changes: State.commitState
      }));
    }
  });
  DeviceInstanceManager.on('commit', updateCommitUI);
  updateCommitUI();

  ctx.websocket.on('close', () => {
    if (State.current) {
      State.current.deselect();
    }
    DeviceInstanceManager.off('commit', updateCommitUI);
  });

  ctx.websocket.on('error', () => {
    ctx.websocket.close();
  });

  ctx.websocket.on('message', async data => {
    try {
      const msg = JSON.parse(data);
      let ctx = null;
      let fn = State.onMessage[msg.cmd];
      if (!fn) {
        ctx = State.current;
        fn = ctx && (ctx[msg.cmd] || ctx.defaultMsg);
      }
      if (fn) {
        q.push(async () => {
          try {
            Log(msg);
            await fn.call(ctx, msg);
          }
          catch (e) {
            Log(e);
          }
        });
        if (q.length === 1) {
          while (q.length) {
            await q[0]();
            q.shift();
          }
        }
      }
    }
    catch (e) {
      console.error(e);
    }
  });

  State.onMessage['tab.select'] = async msg => {
    if (!msg.value) {
      return;
    }
    const tabset = msg.value.split('.');
    const tab = State.tabs[tabset[0]];
    if (!tab) {
      return;
    }
    if (tab !== State.current) {
      await State.current.deselect();
      State.current = tab;
      send('page.change', msg.value);
      await State.current.select(msg.arg);
    }
    else {
      await State.current.reselect(msg.arg);
    }
    if (tabset[1]) {
      State.current.tabSelect(tabset.slice(1).join('.'), msg.arg);
    }
  }

  State.onMessage['changes.commit'] = async msg => {
    if (msg.value === 'start') {
      DeviceInstanceManager.commit();
    }
    else if (msg.value === 'stop') {
      setTimeout(() => {
        html('commit-changes-container', Template.CModal());
      }, 1000);
    }
  }

  State.onMessage['changes.revert'] = async msg => {
    DeviceInstanceManager.revert();
  }
}

module.exports = {
  HTML: HTML,
  WS: WS
};
