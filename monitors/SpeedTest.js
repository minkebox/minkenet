const EventEmitter = require('events');
const SpeedTestNet = require('speedtest-net');
const ConfigDB = require('../Config');
const Log = require('debug')('speedtest');

const SPEEDTEST_TIMER = 60 * 60 * 1000; // 1 hour

class SpeedTest extends EventEmitter {

  start() {
    this.last = null;
    ConfigDB.on('update', evt => {
      if (evt.key === 'monitor.wan.speedtest.enabled') {
        this.enable(evt.value);
      }
    });
    this.enable(ConfigDB.read('monitor.wan.speedtest.enabled'));
  }

  enable(yes) {
    if (yes) {
      if (!this._speedtest) {
        this.last = null;
        this._speedtest = setInterval(() => this._run(), SPEEDTEST_TIMER);
        this._run();
      }
    }
    else {
      if (this._speedtest) {
        clearInterval(this._speedtest);
        this.last = null;
        this._speedtest = null;
      }
    }
  }

  getWanSpeed() {
    if (!this.last) {
      return null;
    }
    return {
      latency: this.last.ping.latency,
      upload: this.last.upload.bandwidth,
      download: this.last.download.bandwidth
    };
  }

  _run() {
    SpeedTestNet({
      acceptLicense: true,
      acceptGdpr: true,
      serverId: ConfigDB.read('monitor.wan.speedtest.id')
    }).then(result => {
      this.last = result;
      this.emit('update');
    }).catch(err => {
      Log(err);
    });
  }

}

module.exports = new SpeedTest();
