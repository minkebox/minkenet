const Template = require('../Template');
const Page = require('../Page');
const MonitorManager = require('../../MonitorManager');
const DeviceInstanceManager = require('../../DeviceInstanceManager');
const DB = require('../../Database');
const ClientManager = require('../../ClientManager');
const SpeedTest = require('../../monitors/SpeedTest');

const REFRESH_TIMER = 60 * 1000; // 1 minute
const ONEDAY = 24 * 60 * 60 * 1000;


class Viz extends Page {

  constructor(root) {
    super(root);
    this.state = {
      clients: {
        all: 0,
        active: 0,
        new: 0
      },
      aps: {
        all: 0,
        new: 0
      },
      switches: {
        all: 0,
        new: 0
      },
      internet: null,
      monitor: []
    };

    this.updateOverview = this.updateOverview.bind(this);
    this.refresh = this.refresh.bind(this);
  }

  async select() {
    await super.select();

    this.updateOverview();
    await this.updateMonitors();

    DeviceInstanceManager.on('add', this.updateOverview);
    DeviceInstanceManager.on('remote', this.updateOverview);
    ClientManager.on('update', this.updateOverview);
    SpeedTest.on('update', this.updateOverview);

    this.html('main-container', Template.VizTab(Object.assign({ first: true }, this.state)));

    this._refreshClock = setInterval(this.refresh, REFRESH_TIMER);
  }

  async deselect() {
    await super.deselect();

    DeviceInstanceManager.off('add', this.updateOverview);
    DeviceInstanceManager.off('remote', this.updateOverview);
    ClientManager.off('update', this.updateOverview);
    SpeedTest.off('update', this.updateOverview);

    clearInterval(this._refreshClock);
  }

  async reselect() {
    await this.refresh();
  }

  async refresh() {
    this.updateOverview();
    await this.updateMonitors();
    this.html('main-container', Template.VizTab(this.state));
  }

  updateOverview() {
    const inlast24hours = Date.now() - (24 * 60 * 60 * 1000);
    const clients = ClientManager.getAllClients();
    this.state.clients.all = Object.keys(clients).length;
    this.state.clients.active = 0;
    this.state.clients.new = 0;
    for (let key in clients) {
      if (clients[key].lastSeen > inlast24hours) {
        this.state.clients.active++;
      }
      if (clients[key].firstSeen > inlast24hours) {
        this.state.clients.net++;
      }
    }

    const newdevices = Object.values(DeviceInstanceManager.getUnauthenticatedDevices());

    this.state.aps.all = DeviceInstanceManager.getWiFiDevices().length;
    this.state.aps.new = newdevices.filter(device => device.description.properties.ap).length;

    this.state.switches.all = DeviceInstanceManager.getSwitchDevices().length;
    this.state.switches.new = newdevices.filter(device => device.description.properties.switch).length;

    const speed = SpeedTest.getWanSpeed();
    if (!speed) {
      this.state.internet = null;
    }
    else {
      this.state.internet = {
        latency: speed.latency.toFixed(2),
        upload: (8 * speed.upload / 1000000).toFixed(2),
        download: (8 * speed.download / 1000000).toFixed(2)
      };
    }

    this.html('viz-overview', Template.VizOverview(this.state));
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
        default:
          break;
      }
      if (graph) {
        this.state.monitor.push(graph);
      }
    }
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
      await MonitorManager.updateMonitors()
    }
  }

  async _makeGraph(mon) {
    const device = DeviceInstanceManager.getDeviceById(mon.deviceid);
    if (!device) {
      return null;
    }

    let title = mon.title;
    if (title.indexOf('##device##') === 0) {
      title = device.name;
      const portnr = parseInt(mon.title.substring(10) || -1);
      if (portnr !== -1) {
        const port = device.readKV(`network.physical.port.${portnr}`);
        if (port && port.name) {
          title = port.name;
        }
      }
    }

    const graph = {
      type: '',
      id: `mon-${mon.id}`,
      title: title,
      series: [],
      data: '[]',
      mon: mon
    };
    let scale = 1;
    let when = Date.now() + ONEDAY;

    switch (mon.type) {
      case '1day':
        graph.type = '1Day';
        scale = 60 * 60 * 1000;
        when -= 60 * 60 * 24 * 1000;
        break;
      case '1hour':
      default:
        graph.type = '1Hour';
        scale = 60 * 1000;
        when -= 60 * 60 * 1000;
        break;
    }
    const data = await DB.readMonitor(`device-${mon.deviceid}`, mon.keys.map(k => k.key), when);
    if (data.length) {
      const tracedata = [];
      mon.keys.forEach((k, ki) => {
        graph.series.push({
          title: k.title,
        });
        const previous = {
          value: 0,
          time: when
        };
        let first = true;
        for (let d = 0; d < data.length; d++) {
          const item = data[d];
          if (item.key === k.key && item.expiresAt > previous.time) {
            const t = (item.expiresAt - when) / scale;
            if (first) {
              first = false;
              if (t > 2) {
                tracedata.push({ t: 0, [`v${ki}`]: 0 }, { t: t, [`v${ki}`]: 0 });
              }
            }
            else {
              tracedata.push({
                t: t,
                [`v${ki}`]: k.scale * 1000 * ((item.value - previous.value) >>> 0) / (item.expiresAt - previous.time)
              });
            }
            previous.value = item.value;
            previous.time = item.expiresAt;
          }
        }
      });
      graph.data = JSON.stringify(tracedata);
    }

    return graph;
  }

  async _makeGauge(mon) {
    const device = DeviceInstanceManager.getDeviceById(mon.deviceid);
    if (!device) {
      return null;
    }

    let title = mon.title;
    if (title.indexOf('##device##') === 0) {
      title = device.name;
      const portnr = parseInt(mon.title.substring(10) || -1);
      if (portnr !== -1) {
        const port = device.readKV(`network.physical.port.${portnr}`);
        if (port && port.name) {
          title = port.name;
        }
      }
    }

    const graph = {
      type: 'Gauge',
      id: `mon-${mon.id}`,
      title: title,
      max: 0,
      series: [],
      mon: mon
    };

    const data = await DB.readMonitor(`device-${mon.deviceid}`, mon.keys.map(k => k.key), Date.now() + ONEDAY - 5 * 60 * 1000);
    mon.keys.forEach(k => {
      const trace = {
        unit: 'Mbps',
        tipunit: k.title,
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
      graph.series.push(trace);
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

    return {
      type: 'Bubbles',
      id: `mon-${mon.id}`,
      title: mon.title,
      link: `#clients.all`,
      series: [
        { title: `Total ${all}`, value: all },
        { title: `Active ${active}`, value: active },
        { title: `New ${recent}`, value: recent }
      ],
      mon: mon
    };
  }

}

module.exports = Viz;
