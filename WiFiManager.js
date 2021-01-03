const EventEmitter = require('events');
const Debounce = require('./utils/Debounce');
const DeviceInstanceManager = require('./DeviceInstanceManager');

class WiFiManager extends EventEmitter {

  constructor() {
    super();
    this.stations = {};
  }

  start() {
    this.deviceUpdate = Debounce(() => {
      this.updateWiFi();
    });
    DeviceInstanceManager.on('update', this.deviceUpdate);
    this.updateWiFi();
  }

  stop() {
    DeviceInstanceManager.off('update', this.deviceUpdate);
  }

  updateWiFi() {
    const devices = DeviceInstanceManager.getAllDevices();
    const newstations = {};
    devices.forEach(dev => {
      if (!dev.description.properties.ap) {
        return;
      }
      const radios = dev.readKV('network.wireless.radio') || {};
      const stations = dev.readKV('network.wireless.station') || {};
      for (let idx in stations) {
        const station = stations[idx];
        if (station.ssid) {
          station.bands = String(station.bands).split(',').map(band => radios[band]);
          const options = dev.readKV(`network.wireless.station.${idx}.security.mode`, { info: true, value: false, selection: true });
          station.security.options = options && options.selection || [ 'none' ];
          const steering = dev.readKV(`network.wireless.station.${idx}.steering.preference`, { info: true, value: false, selection: true });
          if (steering) {
            station.steering.options = steering.selection || [ 'balance' ];
          }
          const cstation = newstations[station.ssid] || (newstations[station.ssid] = { instances: [] });
          cstation.instances.push({
            device: dev,
            station: station
          });
        }
      }
    });
    this.stations = newstations;
    this.emit('update');
  }

  getAllStations() {
    return Object.values(this.stations);
  }

  addDeviceToStation(station, device) {
    for (let i = 0; i < station.instances.length; i++) {
      if (station.instances[i].device === device) {
        return false;
      }
    }
    station.instances.push({
      device: device,
      station: station
    });
    return true;
  }

  removeDeviceFromStation(station, device) {
    for (let i = 0; i < station.instances.length; i++) {
      if (station.instances[i].device === device) {
        station.instances.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  getStationConfig(station) {
    const config = {
      station: station
    };

    const primary = station.instances[0] && station.instances[0].station;
    if (!primary) {
      return config;
    }

    config.ssid = primary.ssid;
    config.enable = primary.enable;
    config.hidden = primary.hidden;

    config.security = {
      mode: primary.security.mode,
      options: [].concat(primary.security.options),
      passphrase: primary.security.passphrase
    };

    if (primary.steering) {
      config.steering = {
        preference: primary.steering.preference,
        options: primary.steering.options
      };
    }

    config.vlan = primary.vlan;
    config.isolate = primary.isolate;
    config.bands = {};

    for (let i = 1; i < station.instances.length; i++) {
      const stat = station.instances[i].station;

      // Make all bands available to station, even if all devices dont support them.
      stat.bands.forEach(band => {
        const name = band.band;
        if (!config.bands[name]) {
          config.bands[name] = {
            band: name
          };
        }
      });

      // Only support security modes available on all devices
      for (let j = config.security.options.length - 1; j >= 0; j--) {
        if (stat.security.options.indexOf(config.security.options[j]) === -1) {
          config.security.options.splice(j, 1);
        }
      }

      // Only support vlan if all instances support vlan
      if (!('vlan' in stat)) {
        delete config.vlan;
      }
      // Same for isolate
      if (!('isolate' in stat)) {
        delete config.isolate;
      }

      // Support as much steering as possible
      if ('steering' in stat) {
        if (!config.steering) {
          config.steering = {};
        }
        if ('enable' in stat.steering) {
          config.steering.enable = stat.steering.enable;
        }
        if ('preference' in stat.steering) {
          config.steering.preference = stat.steering.preference;
        }
        if ('minrssi' in stat.steering) {
          config.steering.minrssi = stat.steering.minrssi
        }
        if ('options' in stat.steering) {
          for (let i = config.steering.options.length - 1; i >= 0; i--) {
            if (stat.steering.options.indexOf(config.steering.options[i]) === -1) {
              config.steering.options.splice(i, 1);
            }
          }
        }
      }
      // Same for fast roaming
      if ('fastroaming' in stat) {
        if (!config.fastroaming) {
          config.fastroaming = {};
        }
        if ('enable' in stat.fastroaming) {
          config.fastroaming.enable = stat.fastroaming.enable;
        }
      }
    }

    if (config.security.options.indexOf(config.security.mode) === -1) {
      config.security.mode = 'none';
    }
    if (config.steering && config.steering.options.indexOf(config.steering.preference) === -1) {
      config.steering.preference = 'balance';
    }

    return config;
  }

  createStation(ssid) {
    this.stations[ssid] = {
      ssid: {
        name: ssid,
        enable: false,
        hidden: false
      },
      instances: [],
      bands: [],
      security: {
        mode: 'none',
        passphrase: ''
      },
      vlan: 0,
      isolate: {
        enable: false,
      },
      fastroaming: {
        enable: false
      },
      steering: {
        enable: false,
        preference: '',
        minrssi: 0
      }
    };
  }

}

module.exports = new WiFiManager();
