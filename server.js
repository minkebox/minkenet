
const Koa = require('koa');
const Websockify = require('koa-websocket');
const CacheControl = require('koa-cache-control');
const Router = require('koa-router');
const EventEmitter = require('events');
const Pages = require('./pages/Pages');
const Config = require('./Config');
const DeviceInstanceManager = require('./DeviceInstanceManager');
const TopologyManager = require('./TopologyManager');
const VLANManager = require('./VLANManager');
const ClientManager = require('./ClientManager');
const Discovery = require('./discovery');
const MonitorManager = require('./MonitorManager');

// Extend path so we can find 'ping' and 'arp'
process.env.PATH = `${process.env.PATH}:/usr/sbin:/sbin`;

// Make the db files easily accessible
process.umask(0);

// More listeners
EventEmitter.defaultMaxListeners = 50;

// Web port
const PORT = parseInt(process.env.PORT || 8080);

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
  VLANManager.start();
  await ClientManager.start();
  Discovery.start();
  await MonitorManager.start();

  App.listen({
    port: PORT
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
    MonitorManager.stop();
    Discovery.stop();
    ClientManager.stop();
    VLANManager.stop();
    TopologyManager.stop();
    DeviceInstanceManager.stop();
    Config.stop();

    process.exit();
  })
})();
