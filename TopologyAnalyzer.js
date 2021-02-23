
const EventEmitter = require('events');
const UDP = require('dgram');
const Process = require('process');
const NanoTimer = new (require('nanotimer'));
const DeviceInstanceManager = require('./DeviceInstanceManager');
const DeviceState = require('./DeviceState');
const Log = require('debug')('topology:analyze');

const PROBE_TIME = 5000;
const DRAIN_TIME = 500;
const PROBE_PAYLOAD_SIZE = 1400;
const PROBE_PAYLOAD_RAW_SIZE = PROBE_PAYLOAD_SIZE + 46;
const PROBE_PORT = 80;
const PROBE_SPEEDLIMIT = 500 * 1000 * 1000; // 500Mb/s

const identity = dev => dev ? `[${dev.name} ${dev.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS)}]` : `[-]`;

class TopologyAnalyzer extends EventEmitter {

  async analyze() {

    try {
      this.running = true;

      // Get the devices in the network and generate the function to read their traffic.
      this._devices = DeviceInstanceManager.getAuthenticatedDevices();
      this._snapfn = this._generateDevicesSnapFunction();

      // Probe each device in turn and generate a snap traffic difference between probes
      const snaps = {};
      this.emit('status', { op: 'baseline' });
      Log('probe: baseline');
      let lastsnap = await this._probeAndSnap(null);
      for (let i = 0; i < this._devices.length && this.running; i++) {
        const selected = this._devices[i];
        Log('probe:', identity(selected));
        this.emit('status', { op: 'probe', device: selected });
        const snap = await this._probeAndSnap(selected);
        snaps[selected._id] = {
          target: selected,
          snaps: [ this._calculateTrafficChange(snap, lastsnap) ],
          signal: {}
        };
        lastsnap = snap;
      }

      if (!this.running) {
        this.emit('status', { op: 'complete', success: false, reason: 'canceled' });
        return;
      }

      // The traffic data will be noisy. Noise is created by other traffic in the network and
      // inexact reporting by devices of their traffic.
      // So we filter the traffic data so we have a single 'path' between devices. A path will
      // consist of a number of devices with a pair of 'lit up' rx and tx ports, and a single
      // device with a lit up rx port (which should be the target).

      // Calculate the mean and standard deviation of the traffic for each snap.
      // We use this information for filtering out the signal from the noise.
      for (let id in snaps) {
        const traffic = snaps[id].snaps[0].traffic;
        let total = 0;
        let count = 0;
        for (let idx = 0; idx < traffic.length; idx++) {
          const trafficInstance = traffic[idx];
          trafficInstance.ports.forEach(port => total += port.rx + port.tx);
          count += 2 * trafficInstance.ports.length * 2;
        }
        const mean = total / count;
        let variance = 0;
        for (let idx = 0; idx < traffic.length; idx++) {
          const trafficInstance = traffic[idx];
          trafficInstance.ports.forEach(port => variance += Math.pow(port.rx - mean, 2) + Math.pow(port.tx - mean, 2));
        }
        snaps[id].signal.stddev = {
          mean: mean,
          deviation: Math.sqrt(variance / (count - 1))
        };
      }

      // Filter each traffic snap and identify the rx and tx port with the largest traffic
      // above the mean + 2 standard deviation.
      for (let id in snaps) {
        const traffic = snaps[id].snaps[0].traffic;
        snaps[id].signal.best = [];
        for (let idx = 0; idx < traffic.length; idx++) {
          const trafficInstance = traffic[idx];
          const foundRx = { port: -1, rx: snaps[id].signal.stddev.mean + 2 * snaps[id].signal.stddev.deviation };
          const foundTx = { port: -1, tx: snaps[id].signal.stddev.mean + 2 * snaps[id].signal.stddev.deviation };
          trafficInstance.ports.forEach((port, idx) => {
            if (port.rx > foundRx.rx) {
              foundRx.rx = port.rx;
              foundRx.port = idx;
            }
            if (port.tx > foundTx.tx) {
              foundTx.tx = port.tx;
              foundTx.port = idx;
            }
          });
          if (foundRx.port !== -1) {
            // Include this signal if we have an active rx port. We may also have an active tx
            // port but *only* having an active tx port isn't valid as anything we cannot measure
            // transmitted data without also receiving.
            snaps[id].signal.best[idx] = {
              device: trafficInstance.device,
              rx: foundRx
            };
            if (foundTx.port !== -1) {
              snaps[id].signal.best[idx].tx = foundTx;
            }
          }
        }
      }

      // At this point, snaps for each probe should only include rx and tx ports with significant traffic as a result of the
      // specific target probe. The noise on other ports should have been filtered out.
      // Reduce the filtered data to a set of snaps which just contains a list of device+ports which were lit-up
      // during the probe.
      const filteredSnaps = [];
      for (let id in snaps) {
        const best = snaps[id].signal.best;
        const active = [];
        for (let idx = 0; idx < best.length; idx++) {
          if (best[idx]) {
            active.push(best[idx]);
          }
        }
        filteredSnaps.push({
          target: snaps[id].target,
          active: active
        });
      }

      // What we have so far
      if (Log.enabled) {
        const p = b => b ? `${b.port} (${(b.rx || b.tx).toLocaleString()})` : `-`;
        //const p = b => b ? `${b.port}` : `-`;
        Log('filtered snaps:');
        filteredSnaps.forEach(snap => {
          Log(` target: ${identity(snap.target)}:`);
          snap.active.forEach(active => Log(`  ${identity(active.device)} rx: ${p(active.rx)} tx: ${p(active.tx)}`));
        });
      }

      // Time to reconstruct the network links from our filtered snaps.

      const links = [];
      let entryPoint = null;
      let indent = 1;

      const walk = path => {

        // Create a list of candidates. A candidate must contain all the devices in the path plus one more.
        const candidates = [];
        filteredSnaps.forEach(snap => {
          let success = (path.length + 1 == snap.active.length);
          for (let i = 0; i < path.length && success; i++) {
            if (!snap.active.find(active => active.device === path[i])) {
              success = false;
            }
          }
          if (success) {
            candidates.push(snap);
          }
        });

        // Create a link for each new candidate, then recurse with the new extended path.
        candidates.forEach(snap => {

          const self = snap.active.find(active => active.device === snap.target);
          const prev = snap.active.find(active => active.device === path[0]);
          if (!prev) {
              entryPoint = { device: self.device, port: self.rx.port };
          }
          else {
            links.push([
              { device: prev.device, port: prev.tx.port },
              { device: self.device, port: self.rx.port }
            ]);
          }

          Log(`${new Array(indent).join('  ')}${identity(snap.target)}`);
          indent++;
          walk([ snap.target ].concat(path));
          indent--;
        });

      }

      walk([]);

      if (Log.enabled) {
        if (entryPoint) {
          Log('entry point:', identity(entryPoint.device), 'port:', entryPoint.port);
        }
        else {
          Log('entry pointL missing;');
        }
        Log('links:');
        links.forEach(link => {
          Log(` ${identity(link[0].device)}:${link[0].port} <--> ${identity(link[1].device)}:${link[1].port}`);
        });
      }

      return {
        success: (entryPoint && links.length == this._devices.length - 1),
        entry: entryPoint,
        topology: links
      };
    }
    finally {
      this.running = false;
    }
  }

  stop() {
    this.running = false;
  }

  //
  // Probe a specific device and return the network traffic after.
  // If no device is given, just snap the current network traffic.
  //
  async _probeAndSnap(device) {
    const injection = device ? await this._probe(device) : 0;
    const traffic = await this._snapfn();
    return {
      target: device,
      bytesInjected: injection,
      traffic: traffic
    }
  }

  //
  // Generate a function which will snapshot the traffic on the given devices, and return the data.
  //
  _generateDevicesSnapFunction() {
    Log('generate device snap fn:');
    const snaps = [];
    this._devices.forEach(dev => {
      const snap = this._generateDeviceSnap(dev);
      snaps.push({ dev: dev, snap: snap });
    });
    this._buildDevicesLagMap();
    return async () => {
      await Promise.all(snaps.map(async snap => await snap.snap.update()));
      const traffic = [];
      snaps.forEach(snap => {
        traffic.push({ device: snap.dev, ports: this._lagMerge(snap.dev, snap.snap.read()) });
      });
      return traffic;
    }
  }

  //
  // Generate the functions to take a snapshot of a device's traffic, and return it'
  // for analysis.
  //
  _generateDeviceSnap(dev) {
    const keys = dev.readKV('network.physical.port', { depth: 1 });
    const info = dev.statisticsInfo();
    if (info.prefer !== 'packets' && dev.readKV(`network.physical.port.0.statistics.rx.bytes`) !== null) {
      const scale = info.scale;
      return {
        update: async () => await dev.statistics(),
        read: () => {
          const r = [];
          for (let key in keys) {
            r.push({
              rx: scale * parseInt(dev.readKV(`network.physical.port.${key}.statistics.rx.bytes`)),
              tx: scale * parseInt(dev.readKV(`network.physical.port.${key}.statistics.tx.bytes`))
            });
          }
          return r;
        }
      };
    }
    else {
      const scale = PROBE_PAYLOAD_RAW_SIZE * info.scale;
      return {
        update: async () => await dev.statistics(),
        read: () => {
          const r = [];
          for (let key in keys) {
            r.push({
              rx: scale * parseInt(dev.readKV(`network.physical.port.${key}.statistics.rx.packets`)),
              tx: scale * parseInt(dev.readKV(`network.physical.port.${key}.statistics.tx.packets`))
            });
          }
          return r;
        }
      };
    }
  }

  // Probe a device by sending a burst of traffic to it. We will later use this to identify
  // which ports were activated. A speed limit is imposed to avoid overrun or flow control in
  // switches which stops the traffic flowing to the destination.
  async _probe(device) {
    let count = 0;
    const begin = Date.now();
    await new Promise(resolve => {
      const data = new Uint8Array(PROBE_PAYLOAD_SIZE);
      const usecperpkt = 1000000 / (PROBE_SPEEDLIMIT / (8 * PROBE_PAYLOAD_RAW_SIZE));
      const client = UDP.createSocket('udp4', {
        sendBufferSize: PROBE_PAYLOAD_SIZE
      });
      const addr = device.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS);
      const send = () => {
        const start = Process.hrtime.bigint();
        client.send(data, PROBE_PORT, addr, () => {
          count++;
          if (!this.running) {
            resolve();
          }
          else if (Date.now() - begin > PROBE_TIME) {
            // Let the packets drain
            setTimeout(resolve, DRAIN_TIME);
          }
          else {
            const wait = usecperpkt - Number(Process.hrtime.bigint() - start);
            NanoTimer.setTimeout(send, '', `${wait}u`);
          }
        });
      }
      send();
    });
    return count * PROBE_PAYLOAD_RAW_SIZE;
  }

  _buildDevicesLagMap() {
    this._lagmap = {};
    this._devices.forEach(device => {
      const lags = device.readKV('network.lags');
      if (lags) {
        const lag = {};
        const ports = lags.port;
        const groups = {};
        for (let p in ports) {
          if (ports[p].group) {
            const portnr = parseInt(p);
            const group = ports[p].group;
            if (!(group in groups)) {
              groups[group] = {
                primary: portnr
              };
            }
            lag[portnr] = groups[group];
          }
        }
        this._lagmap[device._id] = lag;
      }
    });
  }

  //
  // Merge traffic on a device's lags to a primary port.
  //
  _lagMerge(device, ports) {
    const lag = this._lagmap[device._id];
    if (lag) {
      for (let idx = 0; idx < ports.length; idx++) {
        const map = lag[idx];
        if (map && map.primary !== idx) {
          ports[map.primary].rx += ports[idx].rx;
          ports[map.primary].tx += ports[idx].tx;
          ports[idx].rx = 0;
          ports[idx].tx = 0;
        }
      }
    }
    return ports;
  }

  //
  // Calculate the change in traffic between the two snaps, managing rollover counters.
  //
  _calculateTrafficChange(current, previous) {
    const traffic = [];
    const ctraffic = current.traffic;
    const ptraffic = previous.traffic;
    for (let idx = 0; idx < ctraffic.length; idx++) {
      const cports = ctraffic[idx].ports;
      const pports = ptraffic[idx].ports;
      const ports = [];
      for (let pidx = 0; pidx < cports.length; pidx++) {
        ports[pidx] = {
          rx: (cports[pidx].rx - pports[pidx].rx) >>> 0,
          tx: (cports[pidx].tx - pports[pidx].tx) >>> 0
        };
      }
      traffic[idx] = { device: ctraffic[idx].device, ports: ports };
    }
    return {
      target: current.target,
      bytesInjected: current.bytesInjected,
      traffic: traffic
    }
  }

}

module.exports = TopologyAnalyzer;
