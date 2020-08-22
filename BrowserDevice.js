const HTTP = require('http');
const URL = require('url').URL;
const SNMP = require('net-snmp');
const DeviceInstance = require('./DeviceInstance');
const Pup = require('./Pup');
const Eval = require('./BrowserEval');
const DB = require('./Database');
const TypeConversion = require('./utils/TypeConversion');
const DeviceState = require('./DeviceState');
const Log = require('debug')('browser');
const LogContent = Log.extend('content');
const LogState = Log.extend('state');
const LogSNMP = require('debug')('snmp');

const TIMEOUT = { // in mseconds
  loginNavigation: 60000,
  validateNavigation: 60000,
  ping: 3000,
};
const DEFAULT_REFRESH_TIMINGS = { general: 60, statistics: 10 }; // in seconds
const REFRESH_TIMING = 60 * 1000; // 1 minute
const UPDATE_RETRIES = 2;
const HTTPCODE_OK = 200;

class BrowserDeviceInstance extends DeviceInstance {

  constructor(config, state, description) {
    super(config, state);
    this.description = description;
    this._q = [];
    this._watchCount = 0;
    this._watchRunning = false;
    this._authenticated = false; // Login information valid
    this._validated = false; // Device is logged-in
  }

  //
  // Attach the device instance to a browser page
  //
  async attach() {
    if (!this._page) {
      Log('attaching:');
      this._page = await Pup.connect();
    }
  }

  //
  // Detatch the device instance from the real device.
  //
  detach() {
    if (this._page) {
      Pup.disconnect(this._page);
    }
    this._page = null;
  }

  //
  // Watch for changes on this device.
  // We periodically update the state from the physical device while the devie is being
  // watched.
  //
  watch() {
    this._watchCount++;
    Log('watch:', this._id, this._watchCount);
    if (!this._watchRunning) {
      this._watchRunning = true;
      const TopologyManager = require('./TopologyManager');
      const task = async () => {
        if (this._watchCount === 0) {
          this._watchRunning = false;
          return;
        }
        const start = Date.now();
        if (!TopologyManager.running) {
          if (await this.update()) {
            await DB.updateDeviceState(this._id, this.state.toDB());
          }
        }
        setTimeout(task, Math.max(0, Date.now() - start + REFRESH_TIMING));
      }
      task();
    }
    return this._watchCount;
  }

  //
  // Unwatch a device.
  // Stop updating the state from the physical device is no one is watching.
  // We dont immediately stop the watch task to avoid quick start/stop situations.
  //
  unwatch() {
    if (this._watchCount > 0) {
      this._watchCount--;
    }
    Log('unwatch:', this._id, this._watchCount);
    return this._watchCount;
  }

  //
  // Queue a function to be executed in order. This is used to prevent parallel tasks
  // trying to use the browser page at the same time.
  //
  async q(fn) {
    return new Promise(async (resolve, reject) => {
      this._q.push(async () => {
        try {
          resolve(await fn(this._page));
        }
        catch (e) {
          reject(e);
        }
      });
      if (this._q.length === 1) {
        while (this._q.length) {
          await this._q[0]();
          this._q.shift();
        }
      }
    });
  }

  async login(username, password) {
    if (this.description.login) {
      if (await this.webLogin(username, password)) {
        return true;
      }
    }
    else if (this.description.basicAuth) {
      if (await this.basicAuth(username, password)) {
        return true;
      }
    }
    else {
      Log('no login option found:');
    }
    return false;
  }

  logout() {
    this._validated = false;
    this.detach();
  }

  //
  // Login to the real device using the given username and password.
  //
  async webLogin(username, password) {
    // Immediate invalidate so we must successfully login
    this._validated = false;

    const login = this.description.login;
    const url = this.url(login.path);
    Log('login', username, password, url);

    return await this.q(async (page) => {
      try {
        // Sanity check the URL
        Log('ping login url');
        const ping = await this.pingURL();
        Log('pinged');
        if (!ping) {
          throw new Error(`Cannot ping ${url}`);
        }

        // Start the login process by navigating to the root page of the device.
        Log('goto', url);
        await page.goto(url, { timeout: TIMEOUT.loginNavigation, waitUntil: 'networkidle0' });
        Log('goneto', url);

        const frame = await Eval.getFrame(page, login.frame);

        // Some devices have a username (other do not). Select the place to enter it.
        if (login.username) {
          Log('login', username);
          await this.eval('literal', typeof login.username === 'string' ? { $: 'set', value: username, arg: login.username } : Object.assign({ value: username }, login.username), frame);
        }

        // All devices have a password. Select and enter that.
        Log('password', password);
        await this.eval('literal', typeof login.password === 'string' ? { $: 'set', value: password, arg: login.password } : Object.assign({ value: password }, login.password), frame);

        // Activate the login. This probably involves clocking a button but other actions are possible.
        Log('activate', login.activate);
        const actionPromise = this.eval('click', login.activate, frame);
        Log('activated', login.activate);

        //
        // Validate that login was successful.
        //
        let success = false;
        if (!login.valid) {
          // Default validation is to wait for page navigation to occur. If it does, we assume login was successful.
          Log('wait for page navigation');
          const responses = await Promise.all([
            frame.waitForNavigation({ timeout: TIMEOUT.validateNavigation, waitUntil: 'networkidle2' }),
            actionPromise
          ]);
          Log('waited for page navigation');
          if (!responses[0] || responses[0].status() !== 200) {
            success = false;
          }
          else {
            success = true;
          }
        }
        else {
          // Alternatively we can wait for an explict selector to appear on the page
          Log('wait for page navigation');
          const responses = await Promise.all([
            frame.waitForNavigation({ timeout: TIMEOUT.validateNavigation, waitUntil: 'networkidle2' }),
            actionPromise
          ]);
          Log('waited for page navigation');
          Log('wait for selector');
          const response = await this.eval('wait', login.valid, frame);
          Log('waited for selector');
          success = !!response;
        }

        //console.log('success', success);
        this._authenticated = success;
        this._validated = success;
        Log('login', success);
        return success;
      }
      catch (e) {
        console.error(e);
        Log('login failed:');
        // Dont await on this because it seems we can hang here until the request finally completes.
        page.content().then(html => LogContent(html));
        this._validated = false;
        return false;
      }
    });
  }

  async isLoggedIn() {
    Log('isLoggedIn:');
    return await this.q(async (page) => {
      if (!page) {
        throw new Error('Not connected');
      }
      if (!this.description.identify.http.loggedIn) {
        Log('no logged in check:');
        return null;
      }
      const url = this.url();
      Log('ping', url);
      if (!await this.pingURL()) {
        throw new Error(`Cannot ping ${url}`);
      }
      Log('goto', url);
      await page.goto(url, { timeout: TIMEOUT.loginNavigation, waitUntil: 'networkidle2' });
      Log('eval', this.description.identify.http.loggedIn);
      try {
        return TypeConversion.toBoolean(await this.eval('literal', this.description.identify.http.loggedIn, page.mainFrame()));
      }
      catch (_) {
        return false;
      }
    });
  }

  async basicAuth(username, password) {
    // Immediate invalidate so we must successfully login
    this._validated = false;
    const login = this.description.basicAuth;
    const url = this.url(login.path);
    Log('basicAuth:', username, password, url);

    return await this.q(async (page) => {
      try {
        // Sanity check the URL
        Log('ping login url');
        const ping = await this.pingURL();
        Log('pinged');
        if (!ping) {
          throw new Error(`Cannot ping ${url}`);
        }

        // Add authentication. This will persist on the page and be sent with every request.
        await page.authenticate({ username: username, password: password });

        // Start the login process by navigating to the root page of the device.
        Log('goto', url);
        const response = await page.goto(url, { timeout: TIMEOUT.loginNavigation, waitUntil: 'networkidle0' });
        Log('goneto', url);
        Log('status:', response.status());
        const success = (response.status() === HTTPCODE_OK);
        this._authenticated = success;
        this._validated = success;
        Log('basicAuth', success);
        return success;
      }
      catch (e) {
        Log('fail:');
        Log(e);
        this._validated = false;
        return false;
      }
    });
  }

  //
  // Populate the devices state by scraping information from the authenticated hardware device.
  //
  async read() {
    if (!this._validated) {
      throw new Error(`Unauthenticated: ${this.name}`);
    }
    await this.q(async (page) => {
      LogState('read:');
      const result = await this.eval('literal', {
        $0: this.description.constants,
        $1: this.description.read
      }, page.mainFrame());
      Log('reading:');
      LogState(JSON.stringify(result, null, 1));
      // Sanity check
      try {
        if (typeof result.system.macAddress[0] !== 'string') {
          throw Error();
        }
        if (typeof result.system.ipv4.address !== 'string') {
          throw Error();
        }
      }
      catch (e) {
        // Whatever data we read from the device fails our basic sanity checks
        Log('read failed:', JSON.stringify(result, null, 1));
        Log('error:', e);
        throw Error('device read failed');
      }
      this.mergeIntoState(result, true);
      Log('readd:');
      LogState(JSON.stringify(this.state.state, null, 1));
    });
  }

  async statistics() {
    if (!this._validated) {
      throw new Error(`Unauthenticated: ${this.name}`);
    }
    await this.q(async (page) => {
      Log('statistics:');
      const stats = await this.eval('literal', this.description.read.$statistics, page.mainFrame());
      this.mergeIntoState(stats, false, 'statistics');
      Log('statistics:');
      LogState(JSON.stringify(stats, null, 1));
    });
  }

  async write() {
    if (!this._validated) {
      throw new Error(`Unauthenticated: ${this.name}`);
    }
    await this.q(async (page) => {
      Log('write:');
      await this.eval('literal', this.description.write, page.mainFrame());
      Log('written:');
    });
  }

  async commit() {
    if (!this._validated) {
      throw new Error(`Unauthenticated: ${this.name}`);
    }
    await this.q(async (page) => {
      Log('commit:');
      if (this.description.commit) {
        await this.eval('literal', this.description.commit, page.mainFrame());
      }
      await super.commit();
      Log('committed:');
    });
  }

  //
  // Connect to the hardware device. Despite whatever state we start it, if we can, we will
  // be connected and authenticated once we're done.
  async connect() {
    if (this._validated) {
      Log('already connected:');
      return true;
    }
    await this.attach();
    // Some devices keep us logged in even when we think we disconnected
    if (await this.isLoggedIn()) {
      Log('device has us logged in:');
      this._validated = true;
      return true;
    }
    const keychain = this.readKV(DeviceState.KEY_SYSTEM_KEYCHAIN);
    if (await this.login(keychain.username, keychain.password)) {
      return true;
    }
    Log('failed to connect:');
    return false;
  }

  //
  // Update the local state so it reflects the actual device state.
  // Connect and authenticate if necessary.
  //
  async update() {
    this.emit('updating');
    for (let retry = 0; retry < UPDATE_RETRIES; retry++) {
      Log('update:', retry);
      try {
        if (await this.connect()) {
          await this.read();
          return true;
        }
      }
      catch (e) {
        Log(e);
        Log('error during update');
        this._validated = false;
        this.detach();
      }
    }
    return false;
  }

  async updateStatistics() {
    Log('updating statistics');
    try {
      if (await this.connect()) {
        await this.statistics();
        return true;
      }
    }
    catch (_) {
      Log(_);
    }
    return false;
  }

  url(path) {
    const ipv4 = this.readKV(DeviceState.KEY_SYSTEM_IPV4);
    return (new URL(path || '/', `http://${ipv4.address}:${ipv4.port}/`)).toString();
  }

  async pingURL() {
    for (let retry = 2; retry > 0; retry--) {
      const ping = await new Promise(resolve => {
        const url = this.url();
        let timer = null;
        let req = HTTP.get(url, { host: (new URL(url)).host }, res => {
          Log('ping response:', res.statusCode);
          clearTimeout(timer);
          resolve(true);
        });
        timer = setTimeout(() => {
          Log('ping failed');
          req.abort();
          resolve(false);
        }, TIMEOUT.ping);
        req.once('error', err => Log('ping err:', err.toString()));
      });
      if (ping) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
  }

  async eval(def$, value, context) {
    return await Eval.eval(def$, value, context, '$', this);
  }

  getSNMPSession() {
    if (!this.session) {
      const snmp = this.description.snmp || {};
      const ipv4 = this.readKV(DeviceState.KEY_SYSTEM_IPV4_ADDRESS);
      switch (snmp.version || '1') {
        case '1':
        default:
          this.session = SNMP.createSession(ipv4, snmp.community || 'public');
          break;
        case '2c':
          this.session = SNMP.createSession(ipv4, snmp.community || 'public', { version: SNMP.Version2c });
          break;
        case '3':
          const user = {
            name: snmp.name,
            level: SNMP.SecurityLevel.noAuthNoPriv
          };
          if (snmp.auth) {
            const pwd = this.readKV(DeviceState.KEY_SYSTEM_KEYCHAIN_PASSWORD);
            user.level = SNMP.SecurityLevel.authNoPriv;
            user.authProtocol = SNMP.AuthProtocols[snmp.auth];
            user.authKey = pwd;
            if (snmp.priv) {
              user.level = SNMP.SecurityLevel.authPriv;
              user.privProtocol = snmp.priv;
              user.privKey = pwd;
            }
          }
          this.session = SNMP.createV3Session(ipv4, user);
          break;
      }
      this.session.on('error', err => {
        LogSNMP(err);
      });
    }
    return this.session;
  }

  toDB() {
    return {
      _id: this._id,
      dmId: this.description.id
    };
  }

}

class BrowserDevice {

  constructor(description) {
    this.description = description;
  }

  async identify(page, loggedIn, target) {
    try {
      if (loggedIn && this.description.generic) {
        return false;
      }
      for (let ident in this.description.identify) {
        switch (ident) {
          case 'nsdp':
          case 'escp':
          case 'mdns':
          case 'mndp':
          case 'ddp':
            if (target && target.type === ident) {
              let match = true;
              for (let key in this.description.identify[ident].txt) {
                if (target.txt[key] != this.description.identify[ident].txt[key]) {
                  match = false;
                  break;
                }
              }
              if (match) {
                return true;
              }
              const expr = this.description.identify[ident].loggedOut;
              if (expr) {
                const ok = TypeConversion.toBoolean(await Eval.eval('literal', expr, page, '$', null));
                if (ok) {
                  return true;
                }
              }
            }
            break;
          case 'http':
            const expr = loggedIn ? this.description.identify.http.loggedIn : this.description.identify.http.loggedOut;
            if (expr) {
              const ok = TypeConversion.toBoolean(await Eval.eval('literal', expr, page, '$', null));
              if (ok) {
                return true;
              }
            }
            break;
          default:
            break;
        }
      }
    }
    catch (_) {
      //console.log(_);
    }
    return false;
  }

  newInstance(config, state) {
    return new BrowserDeviceInstance(config, state, this.description);
  }

  newInstanceFromGeneric(generic) {
    const device = new BrowserDeviceInstance(generic, generic.state, this.description);
    device._page = generic._page;
    device._authenticated = generic._authenticated;
    device._validated = generic._validated;
    return device;
  }

}

module.exports = BrowserDevice;
