const DeviceInstanceManager = require('../DeviceInstanceManager');
const DeviceState = require('../DeviceState');
const Template = require('./Template');
const Page = require('./Page');
const DevicesTab = require('./Device');
const PortsTab = require('./Ports');
const WirelessTab = require('./Radio');
const NetworksTab = require('./Network');
const LinksTab = require('./Link');
const ClientsTab = require('./Clients');
const ConfigTab = require('./Config');
const MonitorTab = require('./Monitor');
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

  const onMessage = {
  };
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
    current: null,
    tabs: {
      overview: new VizTab(send),
      devices: new Page({ summary: new DevicesTab(send), ports: new PortsTab(send), radios: new WirelessTab(send) }),
      networks: new Page({ vlans: new NetworksTab(send), links: new LinksTab(send), wifi: new WiFiTab(send), capture: new CaptureTab(send) }),
      clients: new Page({ all: new ClientsTab(send) }),
      config: new Page({ defaults: new ConfigTab(send), monitor: new MonitorTab(send) })
    },
    needCommit: false
  };
  State.current = State.tabs.overview,
  State.current.select();

  const onDevicesUpdate = Debounce(() => {
    const need = DeviceInstanceManager.needCommit();
    if (need !== State.needCommit) {
      State.needCommit = need;
      html('commit-revert-buttons', Template.CRButtons({
        changes: State.needCommit
      }));
    }
  });
  State.needCommit = DeviceInstanceManager.needCommit();
  html('commit-revert-buttons', Template.CRButtons({
    changes: State.needCommit
  }));

  DeviceInstanceManager.on('update', onDevicesUpdate);

  ctx.websocket.on('close', () => {
    if (State.current) {
      State.current.deselect();
    }
    DeviceInstanceManager.off('update', onDevicesUpdate);
  });

  ctx.websocket.on('error', () => {
    ctx.websocket.close();
  });

  ctx.websocket.on('message', async data => {
    try {
      const msg = JSON.parse(data);
      let ctx = null;
      let fn = onMessage[msg.cmd];
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

  onMessage['tab.select'] = async msg => {
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
      await State.current.select();
    }
    else {
      await State.current.reselect();
    }
    if (tabset[1]) {
      State.current.tabSelect(tabset.slice(1).join('.'));
    }
  }

  onMessage['changes.commit'] = async msg => {
    if (msg.value === 'start') {
      DeviceInstanceManager.commit(ip => html('commit-changes-update', `Updating ${ip}`)).then(() => {
        html('commit-changes-update', 'Done');
        html('commit-changes-primary', '');
      });
    }
    else if (msg.value === 'stop') {
      setTimeout(() => {
        html('commit-changes-container', Template.CModal());
      }, 1000);
    }
  }

  onMessage['changes.revert'] = async msg => {
    DeviceInstanceManager.revert();
  }
}

module.exports = {
  HTML: HTML,
  WS: WS
};
