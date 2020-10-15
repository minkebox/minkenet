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
      const radios = dev.readKV('network.wireless.radio');
      const stations = dev.readKV('network.wireless.station') || {};
      for (let idx in stations) {
        const station = stations[idx];
        if (station.ssid) {
          const cstation = newstations[station.ssid];
          if (!cstation) {
            if (!station.isolate) {
              station.isolate = {};
            }
            if (!station.fastroaming) {
              station.fastroaming = {};
            }
            if (!station.steering) {
              station.steering = {};
            }
            newstations[station.ssid] = {
              ssid: {
                name: station.ssid,
                enable: station.enable,
                hidden: station.hidden
              },
              instances: [{
                device: dev,
                station: station
              }],
              bands: station.bands.split(',').map(band => radios[band]),
              security: station.security,
              vlan: station.vlan,
              isolate: {
                enable: station.isolate.enable,
              },
              fastroaming: {
                enable: station.fastroaming.enable
              },
              steering: {
                enable: station.steering.enable,
                preference: station.steering.preference,
                minrssi: station.steering.minrssi
              }
            };
          }
          else {
            cstation.instances.push({
              device: dev,
              station: station
            });
          }
        }
      }
    });
    this.stations = newstations;
    this.emit('update');
  }

  getAllStations() {
    return Object.values(this.stations);
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
