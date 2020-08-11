const Template = require('../Template');
const Page = require('../Page');
const MonitorManager = require('../../MonitorManager');
const DeviceInstanceManager = require('../../DeviceInstanceManager');
const DB = require('../../Database');
const ClientManager = require('../../ClientManager');
const SpeedTest = require('../../SpeedTest');

const REFRESH_TIMER = 60 * 1000; // 1 minute


class Viz extends Page {

  constructor(send) {
    super(send);
    this.state = {
      monitor: []
    };

    this.refresh = this.refresh.bind(this);
  }

  async select() {
    await super.select();
    await this.updateMonitors();
    this.html('main-container', Template.VizTab(this.state));

    this._refreshClock = setInterval(this.refresh, REFRESH_TIMER);
  }

  async deselect() {
    await super.deselect();
    clearInterval(this._refreshClock);
  }

  async reselect() {
    await this.refresh();
  }

  async refresh() {
    await this.updateMonitors();
    this.html('main-container', Template.VizTab(this.state));
  }

  async updateMonitors() {
    this.state.monitor = [];
    const monitors = MonitorManager.getAllMonitors();
    for (let i = 0; i < monitors.length; i++) {
      const mon = monitors[i];
      let graph = null;
      switch (mon.type) {
        case '1hour':
        case '1day':
          graph = await this._makeGraph(mon);
          break;
        case 'now':
          graph = await this._makeGauge(mon);
          break;
        case 'clients':
          graph = this._makeClientGraph(mon);
          break;
        case 'wanspeedtest':
          graph = this._makeSpeedtestGraph(mon);
          break;
        default:
          break;
      }
      if (graph) {
        this.state.monitor.push(graph);
      }
    }

    await this._sortAndSaveMonitors();
  }

  async 'mon.move' (msg) {
    const from = msg.value.from;
    const to = msg.value.to;
    const move = this.state.monitor[from];
    if (from !== to) {
      if (from > to) {
        this.state.monitor.forEach(m => {
          if (m.mon.order >= to && m.mon.order <= from) {
            m.mon.order++;
          }
        });
      }
      else {
        this.state.monitor.forEach(m => {
          if (m.mon.order >= from && m.mon.order <= to) {
            m.mon.order--;
          }
        });
      }
      move.mon.order = Math.min(to, this.state.monitor.length);
      await this._sortAndSaveMonitors();
    }
  }

  async _sortAndSaveMonitors() {
    this.state.monitor.sort((a, b) => a.mon.order - b.mon.order);
    this.state.monitor.forEach((m, idx) => m.mon.order = idx);
    await MonitorManager.updateMonitors();
  }

  async _makeGraph(mon) {
    const now = Date.now();

    const device = DeviceInstanceManager.getDeviceById(mon.deviceid);
    if (!device) {
      return null;
    }

    const graph = {
      type: '',
      id: `mon-${mon.id}`,
      title: mon.title,
      trace: [],
      mon: mon
    };
    let scale = 1;

    switch (mon.type) {
      case '1day':
        graph.type = '1Day';
        scale = 60 * 60 * 1000;
        break;
      case '1hour':
      default:
        graph.type = '1Hour';
        scale = 60 * 1000;
        break;
    }
    const data = await DB.readMonitor(mon.name);
    if (data.length) {
      mon.keys.forEach(k => {
        const trace = {
          title: k.title,
          time: [],
          value: []
        };
        const previous = {
          value: 0,
          time: now
        };
        for (let d = 0; d < data.length; d++) {
          const item = data[d];
          if (item.key === k.key && item.expiresAt > previous.time) {
            trace.time.push((item.expiresAt - now) / scale);
            trace.value.push(k.scale * 1000 * ((item.value - previous.value) >>> 0) / (item.expiresAt - previous.time));
            previous.value = item.value;
            previous.time = item.expiresAt;
          }
        }
        // Fix up the beginning of the graph.
        // The first value is unreliable because we can't calculate the difference with tne [-1] value.
        // If the first time is too far in the future, we don't have a full set of data yet, so pad the
        // beginning with zero.
        const ftime = trace.time.shift();
        trace.value.shift();
        if (ftime > 2) {
          trace.value.unshift(0, 0);
          trace.time.unshift(0, ftime);
        }
        graph.trace.push(trace);
      });
    }

    return graph;
  }

  async _makeGauge(mon) {
    const device = DeviceInstanceManager.getDeviceById(mon.deviceid);
    if (!device) {
      return null;
    }

    const graph = {
      type: 'Gauge',
      id: `mon-${mon.id}`,
      title: mon.title,
      max: 0,
      trace: [],
      mon: mon
    };

    const data = await DB.readMonitor(mon.name);
    mon.keys.forEach(k => {
      const trace = {
        title: k.title,
        value: 0
      };
      let pos = data.length;
      if (pos) {
        const previous = {
          value: -1,
          time: 0
        };
        for (let d = 0; d < data.length; d++) {
          const item = data[d];
          if (item.key === k.key) {
            trace.value = k.scale * 1000 * ((item.value - previous.value) >>> 0) / (item.expiresAt - previous.time);
            if (previous.value !== -1 && trace.value > graph.max) {
              graph.max = trace.value;
            }
            previous.value = item.value;
            previous.time = item.expiresAt;
          }
        }
      }
      graph.trace.push(trace);
    });
    return graph;
  }

  _makeClientGraph(mon) {
    const inlast24hours = Date.now() - (24 * 60 * 60 * 1000);
    const clients = ClientManager.getAllClients();
    const all = Object.keys(clients).length;
    let active = 0;
    let recent = 0;
    for (let key in clients) {
      if (clients[key].lastSeen > inlast24hours) {
        active++;
      }
      if (clients[key].firstSeen > inlast24hours) {
        recent++;
      }
    }

    const SIZE = (v) => Math.max(60, 120 * v / all);
    return {
      type: 'Bubbles',
      id: `mon-${mon.id}`,
      title: mon.title,
      link: `#clients.all`,
      trace: [
        { title: `Total ${all}`, value: SIZE(all) },
        { title: `Active ${active}`, value: SIZE(active) },
        { title: `New ${recent}`, value: SIZE(recent) }
      ],
      mon: mon
    };
  }

  _makeSpeedtestGraph(mon) {
    const speed = SpeedTest.getWanSpeed();
    return {
      type: 'Gauge',
      id: `mon-${mon.id}`,
      title: mon.title,
      max: Math.max(speed.upload, speed.download) * 8 / (1024 * 1024),
      trace: [
        { title: 'Download (Mbps)', value: speed.download * 8 / (1024 * 1024) },
        { title: 'Upload (Mbps)', value: speed.upload * 8 / (1024 * 1024) }
      ],
      mon: mon
    };
  }

}

module.exports = Viz;
