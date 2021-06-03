#! /usr/bin/env node
const Koa = require('koa');
const Websockify = require('koa-websocket');
const CacheControl = require('koa-cache-control');
const Router = require('koa-router');
const EventEmitter = require('events');
const Pages = require('./pages/Pages');
const Config = require('./Config');
const DeviceInstanceManager = require('./DeviceInstanceManager');
const TopologyManager = require('./TopologyManager');
const CaptureManager = require('./CaptureManager');
const VLANManager = require('./VLANManager');
const ClientManager = require('./ClientManager');
const Discovery = require('./discovery');
const MonitorManager = require('./MonitorManager');
const WiFiManager = require('./WiFiManager');
const SpeedTest = require('./monitors/SpeedTest');
const NetworkScanner = require('./NetworkScanner');

// Extend path so we can find 'ping' and 'arp'
process.env.PATH = `${process.env.PATH}:/usr/sbin:/sbin`;

// Make the db files easily accessible
process.umask(0);

// More listeners
EventEmitter.defaultMaxListeners = 50;

// Web port (global)
global.WEBPORT = parseInt(process.env.PORT || 8080);

const App = Websockify(new Koa());
App.on('error', err => console.error(err));

App.use(CacheControl({ noCache: true }));

const root = Router();
const wsroot = Router();

Pages(root, wsroot);

App.use(root.middleware());
App.ws.use(wsroot.middleware());
App.ws.use(async (ctx, next) => {
  await next(ctx);
  if (ctx.websocket.listenerCount('message') === 0) {
    ctx.websocket.close();
  }
});

(async () => {
  await Config.start();
  await DeviceInstanceManager.start();
  await TopologyManager.start();
  await ClientManager.start();
  CaptureManager.start();
  VLANManager.start();
  Discovery.start();
  await MonitorManager.start();
  await WiFiManager.start();
  SpeedTest.start();
  NetworkScanner.start();

  App.listen({
    port: WEBPORT
  });

  process.on('uncaughtException', e => {
    console.error('uncaughtException:');
    console.error(e)
  });
  process.on('unhandledRejection', e => {
    console.error('unhandledRejection:');
    console.error(e)
  });

  process.on('SIGTERM', async () => {
    NetworkScanner.stop();
    WiFiManager.stop();
    MonitorManager.stop();
    Discovery.stop();
    VLANManager.stop();
    CaptureManager.stop();
    ClientManager.stop();
    TopologyManager.stop();
    DeviceInstanceManager.stop();
    Config.stop();

    process.exit();
  })
})();
