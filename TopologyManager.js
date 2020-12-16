const UDP = require('dgram');
const EventEmitter = require('events');
const Process = require('process');
const NanoTimer = new (require('nanotimer'));
const DeviceInstanceManager = require('./DeviceInstanceManager');
const DeviceState = require('./DeviceState');
const DB = require('./Database');
const Debounce = require('./utils/Debounce');
const Log = require('debug')('topology');
const LogTimings = Log.extend('timings');

const PROBE_TIME = 5000;
const DRAIN_TIME = 500;
const PROBE_PAYLOAD_SIZE = 1400;
const PROBE_PAYLOAD_RAW_SIZE = PROBE_PAYLOAD_SIZE + 46;
const PROBE_PORT = 80;
const PROBE_SPEEDLIMIT = 500 * 1000 * 1000; // 500Mb/s


class TopologyManager extends EventEmitter {

  constructor() {
    super();
    this._entry = null;
    this._topology = [];
    this.valid = false;
    this.running = false;

    DeviceInstanceManager.on('update', Debounce(() => {
      if (!this.running) {
        this.buildLinkLags();
      }
    }));
  }

  getTopology() {
    return this._topology;
  }

  getAttachmentPoint() {
    return this._entry;
  }

  // Find the path (a set of device/port to device/port links) between two devices.
  findPath(fromDevice, toDevice) {
    // Handle the empty path first.
    if (fromDevice === toDevice) {
      return [];
    }
    const walk = (from, to, links) => {
      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        if (link[0].device === from) {
          if (link[1].device === to) {
            return [ [ link[0], link[1] ] ];
          }
          else {
            const nlinks = [].concat(links);
            nlinks.splice(i, 1);
            const r = walk(link[1].device, to, nlinks);
            if (r) {
              r.unshift([ link[0], link[1] ] );
              return r;
            }
          }
        }
        else if (link[1].device === from) {
          if (link[0].device === to) {
            return [ [ link[1], link[0] ] ];
          }
          else {
            const nlinks = [].concat(links);
            nlinks.splice(i, 1);
            const r = walk(link[0].device, to, nlinks);
            if (r) {
              r.unshift([ link[1], link[0] ]);
              return r;
            }
          }
        }
      }
      return null;
    }
    return walk(fromDevice, toDevice, this._topology);
  }

  // Find the link from the device/port
  findLink(device, portnr) {
    for (let i = 0; i < this._topology.length; i++) {
      const link = this._topology[i];
      if (link[0].device === device && link[0].lag.ports.indexOf(portnr) !== -1) {
        // Return the link with the device:port first
        return link;
      }
      if (link[1].device === device && link[1].lag.ports.indexOf(portnr) !== -1) {
        return [ link[1], link[0] ];
      }
    }
    return null;
  }

  // Find the link associated with the device/lag
  findLinkLag(device, lagnr) {
    for (let i = 0; i < this._topology.length; i++) {
      const link = this._topology[i];
      if (link[0].device === device && link[0].lag.group === lagnr) {
        return link;
      }
      if (link[1].device === device && link[1].lag.group === lagnr) {
        return [ link[1], link[0] ];
      }
    }
    return null;
  }

  clear() {
    this._topology = [];
    this._entry = null;
    this.valid = false;
  }

  cancel() {
    this.running = false;
  }

  setLinkLag(link, type) {
    if (link[0].lag.type != type) {
      for (let i = 0; i < link.length; i++) {
        link[i].lag.type = type;
        let group = 0;
        if (type !== 'none') {
          group = link[i].device.readKV(`network.lags.port.${link[i].port}.group`);
          if (group === 0) {
            // Pick a new group.
            const lags = link[i].device.readKV(`network.lags`);
            const nr = lags.types[type] || 0;
            const available = {};
            for (let i = 1; i <= nr; i++) {
              available[i] = true;
            }
            for (let p in lags.port) {
              delete available[lags.port[p].group];
            }
            group = Object.keys(available)[0];
            if (group === undefined) {
              // No groups available
              throw new Error('no groups');
            }
          }
        }
        link[i].lag.ports.forEach(p => {
          link[i].device.writeKV(`network.lags.port.${p}.type`, type);
          link[i].device.writeKV(`network.lags.port.${p}.group`, group);
        });
      }
    }
  }

  addLinkDevicePort(link, device, portnr) {
    for (let i = 0; i < link.length; i++) {
      if (link[i].device === device && link[i].lag.ports.indexOf(portnr) === -1) {
        const lag = link[i].device.readKV(`network.lags.port.${link[i].port}`);
        if (!link[i].device.writeKV(`network.lags.port.${portnr}.type`, lag.type)) {
          return false;
        }
        link[i].device.writeKV(`network.lags.port.${portnr}.group`, lag.group);
        return true;
      }
    }
    return false;
  }

  removeLinkDevicePort(link, device, portnr) {
    for (let i = 0; i < link.length; i++) {
      if (link[i].device === device) {
        const idx = link[i].lag.ports.indexOf(portnr);
        if (idx !== -1) {
          link[i].device.writeKV(`network.lags.port.${portnr}.type`, 'none');
          link[i].device.writeKV(`network.lags.port.${portnr}.group`, 0);
          return true;
        }
      }
    }
    return false;
  }

  //
  // Read the LAG information for each link and build (or rebuild) the lag
  // state for each link.
  //
  buildLinkLags() {
    // Build a mapping for each device from port to lag group.
    const dev2portmap = this._buildDevicesPortmap(DeviceInstanceManager.getAuthenticatedDevices());
    // Walk each link and add the appropriate lag information.
    let update = false;
    this._topology.forEach(link => {
      link.forEach(point => {
        const oldLag = JSON.stringify(point.lag);
        const portmap = dev2portmap[point.device._id];
        if (portmap) {
          const map = portmap[point.port];
          if (map) {
            point.lag = { type: map.type, ports: map.ports, group: map.group };
          }
          else {
            point.lag = { type: 'none', ports: [ point.port ], group: 0 };
          }
        }
        else {
          point.lag = { type: 'none', ports: [ point.port ], group: 0 };
        }
        if (JSON.stringify(point.lag) !== oldLag) {
          update = true;
        }
      });
    });
    if (update) {
      this.emit('update');
    }
  }

  //
  // Build a device-to-portmap for all lags
  //
  _buildDevicesPortmap(devices) {
    const dev2portmap = {};
    devices.forEach(device => {
      const lags = device.readKV('network.lags');
      if (lags) {
        const portmap = {};
        const ports = lags.port;
        const groups = {};
        for (let p in ports) {
          if (ports[p].group) {
            const portnr = parseInt(p);
            const group = ports[p].group;
            if (group in groups) {
              groups[group].ports.push(portnr);
            }
            else {
              groups[group] = {
                type: ports[p].type,
                port: portnr,
                ports: [ portnr ],
                group: group
              };
            }
            portmap[portnr] = groups[group];
          }
        }
        dev2portmap[device._id] = portmap;
      }
    });
    //Log('portmap:', JSON.stringify(dev2portmap, null, 1));
    return dev2portmap;
  }

  // Discover the topology of the network. This is how the switches
  // interconnect, but does not include any clients.
  async discoverNetworkTopology() {
    const devices = DeviceInstanceManager.getAuthenticatedDevices();
    this.clear();
    return await this.probeAndTest(devices, devices);
  }

  async probeAndTest(probeDevices, measureDevices) {

    this.running = true;

    // Remove any probes that are already in the current topology (we dont re-probe links we've already found)
    for (let i = 0; i < this._topology.length; i++) {
      const link = this._topology[i];
      probeDevices = probeDevices.filter(dev => !(link[0].device === dev || link[1].device === dev));
    }

    // Measure only devices we can read statistics from
    measureDevices = measureDevices.filter(dev => dev.hasStatistics());

    // Build a table which will flag all the ports we activiate by probing a device.
    const probes = probeDevices.map(device => {
      return {
        device: device,
        rx: [],
        tx: []
      };
    });
    const timings = Array(probes.length + 2);
    const counts = Array(probes.length + 2);
    let snapDevices;

    // Setup connetions to all devices
    try {
      Log('connecting');
      this.emit('status', { op: 'connecting' });
      const connections = [].concat(
        await Promise.all(measureDevices.map(dev => dev.connect())),
        await Promise.all(probeDevices.map(dev => dev.connect()))
      );
      if (!this.running) {
        this.emit('status', { op: 'complete', success: false, reason: 'cancelled' });
        return;
      }
      if (!connections.reduce((a, b) => a && b)) {
        Log('connecting failed', connections);
        this.emit('status', { op: 'complete', success: false, reason: 'connecting' });
        return false;
      }
    }
    catch (e) {
      Log('connecting failed', e);
      this.emit('status', { op: 'complete', success: false, reason: 'connecting' });
      return false;
    }

    // Build a baseline of the network traffic
    try {
      Log('starting baseline timing')
      this.emit('status', { op: 'baseline' });
      // First get a baseline of network activity by taking a snapshot before and after we pause of the probe
      // time. This is best done on a quiet(ish) network as we rely on finding the large traffic flow to identify
      // the connections between the switches in the network.
      snapDevices = this._snapDevices(measureDevices);
      timings[0] = await this._snap(snapDevices);
      for (let t = 0; t < 10 && this.running; t++) {
        await new Promise(resolve => setTimeout(resolve, PROBE_TIME / 10));
      }
      timings[1] = await this._snap(snapDevices);
      if (!this.running) {
        this.emit('status', { op: 'complete', success: false, reason: 'cancelled' });
        return;
      }
    }
    catch (e) {
      Log('baseline failed', e);
      this.emit('status', { op: 'complete', success: false, reason: 'baseline' });
      return false;
    }

    // Inject traffic and measure things
    try {
      Log('starting probe timings');
      // Then probe each devices and snap the traffic
      for (let i = 0; i < probes.length && this.running; i++) {
        this.emit('status', { op: 'probe', device: probes[i].device });
        counts[i + 2] = await this._probe(probes[i].device);
        timings[i + 2] = await this._snap(snapDevices);
      }
      if (!this.running) {
        this.emit('status', { op: 'complete', success: false, reason: 'cancelled' });
        return;
      }
      Log('done probe timings');
      this.emit('status', { op: 'probes-complete' });
    }
    catch (e) {
      Log('probes failed', e);
      this.emit('status', { op: 'complete', success: false, reason: 'probes' });
      return false;
    }

    // Analyze the results
    this.emit('status', { op: 'analyzing' });

    // Unify traffic onto a single port if that port is part of a LAG.
    const dev2portmap = this._buildDevicesPortmap(measureDevices);
    for (let i = 0; i < timings.length; i++) {
      for (let d = 0; d < timings[i].length; d++) {
        const portmap = dev2portmap[measureDevices[d]._id];
        if (portmap) {
          for (let p = 0; p < timings[i][d].length; p++) {
            const ap = portmap[p];
            if (!ap) {
              timings[i][d][p].lag = { type: 'none', ports: [ p ] };
            }
            else if (p == ap.port) {
              timings[i][d][p].lag = { type: ap.type, ports: ap.ports };
            }
            else {
              timings[i][d][ap.port].rx += timings[i][d][p].rx;
              timings[i][d][ap.port].tx += timings[i][d][p].tx;
              timings[i][d][p].rx = 0;
              timings[i][d][p].tx = 0;
            }
          }
        }
        else {
          for (let p = 0; p < timings[i][d].length; p++) {
            timings[i][d][p].lag = { type: 'none', ports: [ p ] };
          }
        }
      }
    }

    if (LogTimings.enabled) {
      const f = (v) => ('               ' + v).substr(-15);
      LogTimings('Original timings:');
      LogTimings(` Count: ${counts}`);
      for (let i = 1; i < timings.length; i++) {
        LogTimings(`Timing ${i-1} to ${i}${i === 1 ? ' (baseline)' : ' (probe ' + probes[i-2].device.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS) + ')'}:`);
        for (let d = 0; d < timings[i].length; d++) {
          LogTimings(` Device ${measureDevices[d].readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS)}:`)
          for (let p = 0; p < timings[i][d].length; p++) {
            LogTimings(`  Port ${(' ' + p).substr(-2)}: RX ${f(timings[i][d][p].rx.toLocaleString())} - ${f(timings[i - 1][d][p].rx.toLocaleString())} = ${f(((timings[i][d][p].rx - timings[i - 1][d][p].rx)>>>0).toLocaleString())}  TX ${f(timings[i][d][p].tx.toLocaleString())} - ${f(timings[i - 1][d][p].tx.toLocaleString())} = ${f(((timings[i][d][p].tx - timings[i - 1][d][p].tx)>>>0).toLocaleString())}`);
          }
        }
      }
    }

    // Calculate the baseline
    // '>>>0' forces the answer to be unsigned 32-bits, so we handle wrapping counters
    for (let d = 0; d < timings[0].length; d++) {
      for (let p = 0; p < timings[0][d].length; p++) {
        timings[0][d][p].rx = (timings[1][d][p].rx - timings[0][d][p].rx)>>>0;
        timings[0][d][p].tx = (timings[1][d][p].tx - timings[0][d][p].tx)>>>0;
      }
    }
    // Calculate the traffic differences between each tests.
    // Only keep the rx and tx with the greatest traffic.
    for (let i = 2; i < timings.length; i++) {
      for (let d = 0; d < timings[i].length; d++) {
        let maxrx = { rx: counts[i] / 3, p: -1 };
        let maxtx = { tx: counts[i] / 3, p: -1 };
        for (let p = 0; p < timings[i][d].length; p++) {
          // '>>>0' forces the answer to be unsigned 32-bits, so we handle wrapping counters
          // Deduct the baseline after the 32-bit wrap. It can go negative now but that's okay.
          const rx = ((timings[i][d][p].rx - timings[i - 1][d][p].rx)>>>0) - timings[0][d][p].rx;
          timings[i - 1][d][p].rx = rx;
          if (rx > maxrx.rx) {
            maxrx.rx = rx;
            maxrx.p = p;
          }
          const tx = ((timings[i][d][p].tx - timings[i - 1][d][p].tx)>>>0) - timings[0][d][p].tx;
          timings[i - 1][d][p].tx = tx;
          if (tx > maxtx.tx) {
            maxtx.tx = tx;
            maxtx.p = p;
          }
        }
        // We can have either rx/tx or just an rx. In the first case, the traffic should
        // be similar. If tx is must less than rx then we eliminate it and assume this device
        // is just receiving.
        if (maxtx.tx < maxrx.rx * 0.75) {
          maxtx.p = -1;
        }
        // Stash the best rx/tx ports
        if (maxrx.p !== -1) {
          probes[i-2].rx.push({ device: measureDevices[d], port: maxrx.p, lag: timings[i][d][maxrx.p].lag });
        }
        if (maxtx.p !== -1) {
          probes[i-2].tx.push({ device: measureDevices[d], port: maxtx.p, lag: timings[i][d][maxtx.p].lag });
        }
      }
    }

    if (LogTimings.enabled) {
      LogTimings('Calculated timing differences');
      const f = (v) => ('               ' + v).substr(-15);
      for (let i = 0; i < timings.length - 1; i++) {
        LogTimings(`Timing ${i}${i === 0 ? ' (baseline)' : ' (probe ' + probes[i-1].device.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS) + ')'} (count ${counts[i+1]}):`);
        for (let d = 0; d < timings[i].length; d++) {
          LogTimings(` Device ${measureDevices[d].readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS)}:`)
          for (let p = 0; p < timings[i][d].length; p++) {
            LogTimings(`  Port ${(' ' + p).substr(-2)}: RX ${f(timings[i][d][p].rx.toLocaleString())}  TX ${f(timings[i][d][p].tx.toLocaleString())}`);
          }
        }
      }
    }

    // Calculate the maximum baseline traffic we saw. If this is in the same ballpark as the probe traffic
    // the network is too busy for this to work.
    const maxtraffic = timings[0].reduce((acc, dev) => {
      return Math.max(acc, dev.reduce((acc, port) => {
        return Math.max(acc, port.rx, port.tx);
      }, 0));
    }, 0);
    const mincount = counts.reduce((acc, count) => Math.min(acc, count), Number.MAX_SAFE_INTEGER);
    Log('maxtraffic', maxtraffic.toLocaleString(), 'mincount', mincount.toLocaleString());
    if (maxtraffic > mincount / 2) {
      Log('Network too busy to determine topology');
      this.emit('status', { op: 'complete', success: false, reason: 'busy' });
      return false;
    }

    let nprobes = probes;

    if (Log.enabled) {
      Log('raw topology:');
      Log(nprobes.map(probe => { return {
        name: probe.device.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS),
        rx: JSON.stringify(probe.rx.map(rx => [ rx.device.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS), rx.port, rx.lag ])),
        tx: JSON.stringify(probe.tx.map(tx => [ tx.device.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS), tx.port, tx.lag ]))
      }}));
    }

    // Remove the entry node from the probe data. The entry node is signified by
    // a probe with a single rx port lit up.
    for (let i = 0; i < nprobes.length; i++) {
      if (nprobes[i].rx.length === 1 && nprobes[i].tx.length === 0) {
        Log('filtering entry node');
        this._entry = nprobes[i].rx[0];
        nprobes = this._filterProbes(nprobes, nprobes[i].rx[0], {});
        break;
      }
    }
    // Remove any known topology. When we're probing new devices we've added, we only
    // want to find links that extend the current topology.
    for (let i = 0; i < this._topology.length; i++) {
      const link = this._topology[i];
      nprobes = this._filterProbes(nprobes, link[0], link[1]);
    }

    if (Log.enabled) {
      Log('building topology:');
      Log(nprobes.map(probe => { return {
        name: probe.device.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS),
        rx: JSON.stringify(probe.rx.map(rx => [ rx.device.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS), rx.port, rx.lag ])),
        tx: JSON.stringify(probe.tx.map(tx => [ tx.device.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS), tx.port, tx.lag ]))
      }}));
    }
    // Map the topology from the probe activation data by walking the connections.
    const topology = [];
    const remaining = this._walkTopology(nprobes, topology);
    const success = remaining.length === 0;
    if (Log.enabled) {
      Log('network topology success', success);
      if (this._entry) {
        Log('Entry', JSON.stringify({ ip: this._entry.device.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS), port: this._entry.port, lag: this._entry.lag }));
      }
      Log(topology.map(link => [
        { ip: link[0].device.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS), port: link[0].port, lag: link[0].lag },
        { ip: link[1].device.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS), port: link[1].port, lag: link[1].lag }
      ]));
      Log(remaining.map(probe => { return {
        name: probe.device.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS),
        rx: JSON.stringify(probe.rx.map(rx => [ rx.device.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS), rx.port, rx.lag ])),
        tx: JSON.stringify(probe.tx.map(tx => [ tx.device.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS), tx.port, tx.lag ]))
      }}));
    }

    this.running = false;
    this.valid = success;
    if (!success) {
      this.emit('status', { op: 'complete', success: false, reason: 'topology' });
    }
    else {
      this._topology = this._topology.concat(topology);
      DB.updateTopology(this.toDB());
      this.emit('status', { op: 'complete', success: true, topology: this._topology });
      this.emit('update');
    }
    return success;
  }

  _walkTopology(probes, topology) {
    for (let i = 0; i < probes.length; ) {
      // The easy ones first. A single RX/TX pair is a link between the two devices.
      if (probes[i].rx.length === 1 && probes[i].tx.length === 1) {
        const rx = probes[i].rx[0];
        const tx = probes[i].tx[0];
        topology.push([ rx, tx ]);
        probes = this._filterProbes(probes, rx, tx);
        i = 0;
        continue;
      }
      // Slight tricker, but if one RX and TX are on the same device, we have
      // two identifable links. Ideally we don't need this if information is prefect. but
      // it isn't always.
      if (probes[i].rx.length === 2 && probes[i].tx.length === 2) {
        const rxs = probes[i].rx;
        const txs = probes[i].tx;
        if (rxs[0].device === txs[0].device || rxs[1].device === txs[1].device) {
          topology.push([ rxs[1], txs[0] ]);
          topology.push([ rxs[0], txs[1] ]);
          probes = this._filterProbes(this._filterProbes(probes, rxs[1], txs[0]), rxs[0], txs[1]);
          i = 0;
          continue;
        }
        if (rxs[0].device === txs[1].device || rxs[1].device === txs[0].device) {
          topology.push([ rxs[0], txs[0] ]);
          topology.push([ rxs[1], txs[1] ]);
          probes = this._filterProbes(this._filterProbes(probes, rxs[0], txs[0]), rxs[1], txs[1]);
          i = 0;
          continue;
        }
      }
      // If we have a single TX port, then we're connected to something we can't measure.
      // It will be either the probed device (or if we're really unlucky, a chain of unmeasured
      // devices with the probed device at the end).
      // The safest thing to do is to exclude it from the topology.
      if (probes[i].rx.length === 0 && probes[i].tx.length === 1) {
        probes = this._filterProbes(probes, {}, probes[i].tx[0]);
        i = 0;
        continue;
      }

      i++;
    }
    return probes;
  }

  // Strip out the rx and tx and remove any nodes which are now empty.
  _filterProbes(probes, rx, tx) {
    return probes.map(node => {
      return {
        device: node.device,
        rx: node.rx.filter(trx => !(rx.device === trx.device && rx.port === trx.port)),
        tx: node.tx.filter(ttx => !(tx.device === ttx.device && tx.port === ttx.port))
      }
    }).filter(node => node.rx.length || node.tx.length);
  }

  _snapDevices(devices) {
    return devices.map(dev => {
      const keys = dev.readKV('network.physical.port', { depth: 1 });
      if (dev.readKV(`network.physical.port.0.statistics.rx.bytes`) !== null) {
        return [
          async () => await dev.statistics(),
          () => {
            const r = [];
            for (let key in keys) {
              r.push({
                rx: parseInt(dev.readKV(`network.physical.port.${key}.statistics.rx.bytes`)),
                tx: parseInt(dev.readKV(`network.physical.port.${key}.statistics.tx.bytes`))
              });
            }
            return r;
          }
        ];
      }
      else {
        return [
          async () => await dev.statistics(),
          () => {
            const r = [];
            for (let key in keys) {
              r.push({
                rx: PROBE_PAYLOAD_RAW_SIZE * parseInt(dev.readKV(`network.physical.port.${key}.statistics.rx.packets`)),
                tx: PROBE_PAYLOAD_RAW_SIZE * parseInt(dev.readKV(`network.physical.port.${key}.statistics.tx.packets`))
              });
            }
            return r;
          }
        ];
      }
    });
  }

  async _snap(deviceSnaps) {
    await Promise.all(deviceSnaps.map(async info => await info[0]()));
    return deviceSnaps.map(info => info[1]());
  }

  // Probe a device by sending a burst of traffic to it. We will later use this to identify
  // which ports were activated. A speed limit is imposed to avoid overrun or flow control in
  // switches which stops the traffic flowing to the destination.
  async _probe(device) {
    Log(`Probing ${device.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS)}`);
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

  toDB() {
    return {
      _id: 'topology',
      valid: this.valid,
      entry: this._entry ? { deviceId: this._entry.device._id, port: this._entry.port } : null,
      topology: this._topology.map(link => [
        { deviceId: link[0].device._id, port: link[0].port } , { deviceId: link[1].device._id, port: link[1].port }
      ])
    };
  }

  fromDB(dbTopology) {
    this.valid = false;
    if (dbTopology) {
      try {
        this._entry = { device: DeviceInstanceManager.getDeviceById(dbTopology.entry.deviceId), port: dbTopology.entry.port },
        this._topology = dbTopology.topology.map(link => {
          const d0 = DeviceInstanceManager.getDeviceById(link[0].deviceId);
          const d1 = DeviceInstanceManager.getDeviceById(link[1].deviceId);
          if (!d0 || !d1) {
            throw Error();
          }
          return [{ device: d0, port: link[0].port }, { device: d1, port: link[1].port }];
        });
        this.valid = dbTopology.valid;
      }
      catch (_) {
        // Failed to rebuild topology - device deleted?
        this._entry = null;
        this._topology = [];
        this.valid = false;
      }
    }
  }

  async start() {
    this.fromDB(await DB.getTopology());
    this.buildLinkLags();
    this._invalid = () => {
      this.valid = false;
      DB.updateTopology(this.toDB());
      this.emit('update');
    }
    DeviceInstanceManager.on('add', this._invalid);
    DeviceInstanceManager.on('remove', this._invalid);
  }

  stop() {
    DeviceInstanceManager.off('add', this._invalid);
    DeviceInstanceManager.off('remove', this._invalid);
  }
}

module.exports = new TopologyManager();
