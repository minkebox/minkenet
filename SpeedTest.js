const EventEmitter = require('events');
const SpeedTestNet = require('@lh2020/speedtest-net');

const SPEEDTEST_TIMER = 60 * 60 * 1000; // 1 hour

class SpeedTest extends EventEmitter {

  getWanSpeed() {
    if (!this._speedtest) {
      this.last = {
        ping: { latency: 0 },
        download: { bandwidth: 0 },
        upload: { bandwidth: 0 }
      };
      this._speedtest = setInterval(() => this._run(), SPEEDTEST_TIMER);
      this._run();
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
      acceptGdpr: true
    }).then(result => {
      this.last = result;
      this.emit('update');
    });
  }

}

module.exports = new SpeedTest();
