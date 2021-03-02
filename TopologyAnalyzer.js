
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
const PROBE_SPEEDLIMIT = 750 * 1000 * 1000; // bits/s
const MAX_ATTEMPTS = 3;
const ZSCORE_CEILING = 3;

const identity = dev => dev ? `[${dev.name} ${dev.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS)}]` : `[-]`;

class TopologyAnalyzer extends EventEmitter {

  async analyze() {

    try {
      this.running = true;

      // Get the devices in the network and generate the function to read their traffic.
      this._devices = DeviceInstanceManager.getAuthenticatedDevices();
      this._snapfn = this._generateDevicesSnapFunction();

      // Connect to everything before we start
      if (!await this._connectAll()) {
        return {
          success: false,
          reason: 'connecting'
        };
      }

      // Probe each device in turn and generate a snap traffic difference between probes
      const snaps = [];
      this.emit('status', { op: 'baseline' });
      Log('probe: baseline');
      let lastsnap = await this._probeAndSnap(null);
      for (let i = 0; i < this._devices.length; i++) {
        const selected = this._devices[i];
        let stddev = null;
        let best = null;
        let snapdiff = null;
        let attempt = 0;
        let retry = true;
        for (; retry && attempt < MAX_ATTEMPTS && this.running; attempt++) {
          retry = false;
          Log(`probe: ${attempt}:`, identity(selected));
          this.emit('status', { op: 'probe', device: selected, attempt: attempt });

          // Run a probe test then calculate the traffic it generated (appoximately).
          const snap = await this._probeAndSnap(selected);
          snapdiff = this._calculateTrafficChange(snap, lastsnap);
          lastsnap = snap;

          // Calculate the max, mean and standard deviation of the traffic for each snap.
          // We use this information for filtering out the signal from the noise.

          const traffic = snapdiff.traffic;
          let total = 0;
          let max = 0;
          let count = 0;
          for (let idx = 0; idx < traffic.length; idx++) {
            const trafficInstance = traffic[idx];
            trafficInstance.ports.forEach(port => {
              total += port.rx + port.tx;
              if (port.rx > max) {
                max = port.rx;
              }
              if (port.tx > max) {
                max = port.tx;
              }
            });
            count += trafficInstance.ports.length * 2;
          }
          const mean = Math.round(total / count);
          let variance = 0;
          for (let idx = 0; idx < traffic.length; idx++) {
            const trafficInstance = traffic[idx];
            trafficInstance.ports.forEach(port => variance += Math.pow(port.rx - mean, 2) + Math.pow(port.tx - mean, 2));
          }
          stddev = {
            max: max,
            mean: mean,
            deviation: Math.round(Math.sqrt(variance / (count - 1)))
          };

          // Filter each traffic snap and identify the rx and tx port with the largest traffic
          // above a specific threshold.
          // We use a high zscore to detect the outliers (our traffic), of which there should only be
          // one for tx and rx per device.

          best = [];
          for (let idx = 0; idx < traffic.length; idx++) {
            const trafficInstance = traffic[idx];
            const foundRx = { port: -1, rx: 0, count: 0 };
            const foundTx = { port: -1, tx: 0, count: 0 };
            trafficInstance.ports.forEach((port, idx) => {
              const zscoreRx = (port.rx - stddev.mean) / stddev.deviation;
              const zscoreTx = (port.tx - stddev.mean) / stddev.deviation;
              if (zscoreRx > ZSCORE_CEILING) {
                foundRx.rx = port.rx;
                foundRx.port = idx;
                foundRx.count++;
              }
              if (zscoreTx > ZSCORE_CEILING) {
                foundTx.tx = port.tx;
                foundTx.port = idx;
                foundTx.count++;
              }
            });

            // Include this signal if we have an active rx port which may optionally have an active tx.
            // Only specific combinations are valid if we've successfully identify our probe traffic.
            // Other combinations are flagged and we will retry this probe.
            // Valid combinations: [rx:0,tx:0] [rx:1,tx:0] [rx:1,tx:1]

            if (foundRx.count === 0) {
              if (foundTx.count === 0) {
                best[idx] = null;
              }
              else {
                // Somehow we see traffic being transmitted but none received. Retry
                Log(`error: ${identity(trafficInstance.device)} tx traffic only`);
                retry = true;
              }
            }
            else if (foundRx.count === 1) {
              if (foundTx.count === 0) {
                // rx-only traffic will only happen on the device we're probing (it wont be transmitting the traffic
                // onwards).
                if (trafficInstance.device === selected) {
                  best[idx] = {
                    device: trafficInstance.device,
                    rx: foundRx
                  };
                }
                else {
                  Log(`error: ${identity(trafficInstance.device)} rx-only traffic on non-target`);
                  retry = true;
                }
              }
              else if (foundTx.count === 1) {
                best[idx] = {
                  device: trafficInstance.device,
                  rx: foundRx,
                  tx: foundTx
                };
              }
              else {
                // There can be at most one tx port lit-up, so there may be too much traffic in this snap
                // to analyze. Retry
                Log(`error: ${identity(trafficInstance.device)} tx traffic > 1`);
                retry = true;
              }
            }
            else {
              // More than one rx port it lit-up, so there was too much traffic on the network for this snap
              // to be analyzed. Retry
              Log(`error: ${identity(trafficInstance.device)} rx traffic > 1`);
              retry = true;
            }
          }
        }

        // Canceled?
        if (!this.running) {
          return {
            success: false,
            reason: 'canceled'
          };
        }

        // Tried a number of time to analyse a snap but eventually gave up - fail
        if (retry) {
          return {
            success: false,
            reason: 'busy'
          };
        }

        // At this point the snap should only include rx and tx ports with significant traffic as a result of the
        // specific target probe. The noise on other ports should have been filtered out.
        // Reduce the filtered data to a set of snaps which just contains a list of device+ports which were lit-up
        // during the probe.
        const active = [];
        for (let idx = 0; idx < best.length; idx++) {
          if (best[idx]) {
            active.push(best[idx]);
          }
        }

        snaps.push({
          target: selected,
          snap: snapdiff,
          active: active,
          stddev: stddev
        });
      }

      if (Log.enabled) {
        const p = b => b ? `${b.port} (${(b.rx || b.tx || '0').toLocaleString()})` : `-`;

        Log('unfiltered snaps:');
        snaps.forEach(snap => {
          Log(` target: ${identity(snap.target)}: max ${snap.stddev.max.toLocaleString()} mean ${snap.stddev.mean.toLocaleString()} deviation ${snap.stddev.deviation.toLocaleString()}`);
          snap.snap.traffic.forEach(trafficInstance => {
            const foundRx = { port: -1, rx: 0 };
            const foundTx = { port: -1, tx: 0 };
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
            Log(`  ${identity(trafficInstance.device)} rx: ${p(foundRx)} tx: ${p(foundTx)}`);
          });
        });
        Log('');
        Log('filtered snaps:');
        snaps.forEach(snap => {
          Log(` target: ${identity(snap.target)}: max ${snap.stddev.max.toLocaleString()} mean ${snap.stddev.mean.toLocaleString()} deviation ${snap.stddev.deviation.toLocaleString()}`);
          snap.active.forEach(active => Log(`  ${identity(active.device)} rx: ${p(active.rx)} tx: ${p(active.tx)}`));
        });
      }

      // Time to reconstruct the network links from our filtered snaps.

      const links = [];
      let entryPoint = null;

      const walk = path => {

        // Create a list of candidates. A candidate must contain all the devices in the path plus one more.
        const candidates = [];
        snaps.forEach(snap => {
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
          Log(`${new Array(path.length + 1).join('  ')}${identity(snap.target)}`);

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

          walk([ snap.target ].concat(path));
        });

      }
      Log('');
      Log('hierarchy:');
      walk([]);

      if (Log.enabled) {
        Log('entry point:', entryPoint ? `${identity(entryPoint.device)} port: ${entryPoint.port}` : 'missing');
        Log('links:');
        links.forEach(link => {
          Log(` ${identity(link[0].device)}:${link[0].port} <--> ${identity(link[1].device)}:${link[1].port}`);
        });
      }

      // Topology needs to basically look like this
      if (!entryPoint || links.length !== this._devices.length - 1) {
        return {
          success: false,
          reason: 'busy'
        };
      }

      return {
        success: true,
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
  // Connect to all the devices (before we start the analysis).
  //
  async _connectAll() {
    try {
      Log('connecting');
      this.emit('status', { op: 'connecting' });
      const connections = await Promise.all(this._devices.map(dev => dev.connect()))
      if (!this.running) {
        this.emit('status', { op: 'complete', success: false, reason: 'canceled' });
        return false;
      }
      if (!connections.reduce((a, b) => a && b)) {
        Log('connecting failed', connections.map((success, idx) => success ? '' : `${identity(this._devices[idx])} `).join(''));
        this.emit('status', { op: 'complete', success: false, reason: 'connecting' });
        return false;
      }
      return true;
    }
    catch (e) {
      Log('connecting failed', e);
      this.emit('status', { op: 'complete', success: false, reason: 'connecting' });
      return false;
    }
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
    const info = dev.statisticsInfo();
    if (info.prefer !== 'packets' && dev.readKV(`network.physical.port.0.statistics.rx.bytes`) !== null) {
      const scale = info.scale;
      const rx = (v) => {
        try {
          return scale * parseInt(v.statistics.rx.bytes);
        }
        catch (_) {
          return 0;
        }
      }
      const tx = (v) => {
        try {
          return scale * parseInt(v.statistics.tx.bytes);
        }
        catch (_) {
          return 0;
        }
      }
      return {
        update: async () => await dev.statistics(),
        read: () => {
          const r = [];
          const v = dev.readKV(`network.physical.port`);
          for (let key in v) {
            r.push({ rx: rx(v[key]), tx: tx(v[key]) });
          }
          return r;
        }
      };
    }
    else {
      const scale = PROBE_PAYLOAD_RAW_SIZE * info.scale;
      const rx = (v) => {
        try {
          return scale * parseInt(v.statistics.rx.packets);
        }
        catch (_) {
          return 0;
        }
      }
      const tx = (v) => {
        try {
          return scale * parseInt(v.statistics.tx.packets);
        }
        catch (_) {
          return 0;
        }
      }
      return {
        update: async () => await dev.statistics(),
        read: () => {
          const r = [];
          const v = dev.readKV(`network.physical.port`);
          for (let key in v) {
            r.push({ rx: rx(v[key]), tx: tx(v[key]) });
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
            client.close();
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
          rx: Math.floor(((cports[pidx].rx - pports[pidx].rx) >>> 0) / 1000000),
          tx: Math.floor(((cports[pidx].tx - pports[pidx].tx) >>> 0) / 1000000)
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
