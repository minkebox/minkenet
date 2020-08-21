const URL = require('url').URL;
const Path = require('path');
const JSONPath = require('jsonpath-plus').JSONPath;
const SNMP = require('net-snmp');
const TypeConversion = require('./utils/TypeConversion');
const { type } = require('jquery');
const Log = require('debug')('browser:eval');
const LogNav = require('debug')('browser:nav');

const TIMEOUT = {
  frameNavigation: 30000,
  validateNavigation: 5000
};

class Eval {
  //
  // Evaluate an expression value within the given context.
  // We use this for extracting data from the device and so we support
  // various forms and mappings.
  //
  async eval(def$, value, context, path, device) {
    Log('eval:', path, value);
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      // Short circuit a common case
      if (def$ === 'literal') {
        return value;
      }
      value = { $: def$, arg: value };
      Log(' eval:', path, value);
    }
    if (!('$' in value)) {
      const obj = {};
      for (let k in value) {
        // Alt key$nr format
        let key = k;
        const idx = key.indexOf('$');
        if (idx !== -1) {
          key = key.slice(0, idx);
        }
        const result = await this.eval(def$, value[k], context, `${path}${key ? '.' : ''}${key}`, device);
        if (result === null || result === undefined) {
          return null;
        }
        if (key === '_') {
          // Ignore
        }
        else if (!obj[key]) {
          obj[key] = result;
        }
        else {
          this.merge(obj[key], result);
        }
      }
      const nrkeys = Object.keys(obj).length;
      // Nothing successfully evaluated, return null
      if (nrkeys === 0) {
        return null;
      }
      // If we merged in a set of keys of the form '$nr' then we just return the merged object.
      if (obj[''] && nrkeys === 1) {
        return obj[''];
      }
      if (Array.isArray(value)) {
        return Object.values(obj);
      }
      return obj;
    }

    const callContext = {
      readKV: (key, options) => device.readKV(key, options),
      eval: (def$, value, npath, ncontext) => {
        if (typeof def$ === 'string') {
          return this.eval(def$, value, ncontext || context, npath || path, device);
        }
        else {
          return this.eval('literal', def$, context, path, device);
        }
      },
      def$: def$,
      value: value,
      context: context,
      path: path
    };

    // Otherwise we evaluate it in some way
    switch (value.$) {
      case 'literal':
        return value.arg;
      case 'type':
        return await this.eval(value.type, value.arg, context, path, device);
      case 'eval':
      {
        const frame = await this.getEvalFrame(context, value);
        return await this.map(value, await frame.evaluate(await this.eval('literal', value.arg, context, path, device)));
      }
      case 'jsonp':
      {
        return await this.map(value, JSONPath({ path: value.arg, json: context })[0]);
      }
      case 'selector':
      {
        return await this.map(value, await (await this.getEvalFrame(context, value)).$eval(value.arg, elem => elem.type == 'radio' ? elem.checked : (elem.value || elem.innerText)));
      }
      case 'set':
      {
        const frame = await this.getEvalFrame(context, value);
        let nvalue = '';
        if ('value' in value) {
          nvalue = await this.eval(def$, value.value, frame, path, device)
        }
        else {
          nvalue = await this.eval('kv', path, frame, path, device)
        }
        const text = await this.map(value, nvalue);
        Log('set text', text);
        // Remove the INPUT value before we 'type' in the new text.
        await frame.$eval(value.arg, elem => elem.value = '');
        await frame.type(value.arg, text);
        return true;
      }
      case 'click':
      {
        return await (await this.getEvalFrame(context, value)).click(value.arg);
      }
      case 'select':
      {
        const frame = await this.getEvalFrame(context, value);
        let option;
        if ('value' in value) {
          option = await this.eval('literal', value.value, frame, path, device);
        }
        else if ('index' in value) {
          option = await frame.evaluate(`document.querySelector('${value.arg} option:nth-child(${value.index}').value`);
        }
        else {
          option = await this.eval('kv', path, frame, path, device);
        }
        option = TypeConversion.toString(await this.map(value, option));
        Log('select option', option);
        const selected = await frame.select(value.arg, option);
        Log('selected', selected);
        return !!selected.length;
      }
      case 'wait':
      {
        return await (await this.getEvalFrame(context, value)).waitForSelector(value.arg, { timeout: value.timeout || TIMEOUT.validateNavigation });
      }
      case 'click+nav':
      {
        const frame = await this.getEvalFrame(context, value);
        LogNav('waitfornav:');
        const result = await Promise.all([
          frame.click(value.arg),
          frame.waitForNavigation({ timeout: value.timeout || TIMEOUT.frameNavigation, waitUntil: 'networkidle2' })
        ]);
        LogNav('waitedfornav:');
        return result;
      }
      case 'select+nav':
      {
        const frame = await this.getEvalFrame(context, value);
        let option;
        if ('value' in value) {
          option = await this.eval('literal', value.value, frame, path, device);
        }
        else if ('index' in value) {
          option = await frame.evaluate(`document.querySelector('${value.arg} option:nth-child(${value.index}').value`);
        }
        else {
          option = await this.eval('kv', path, frame, path, device);
        }
        LogNav('waitfornav:');
        const r = await Promise.all([
          frame.select(value.arg, option),
          frame.waitForNavigation({ timeout: value.timeout || TIMEOUT.frameNavigation, waitUntil: 'networkidle2' })
        ]);
        LogNav('waitedfornav:');
        return TypeConversion.toNatural(r[0]);
      }
      case 'kv':
      {
        const v = await this.map(value, device.readKV(value.arg || path, value.options));
        Log('v=', v);
        return v;
      }
      case 'tojson':
      {
        const obj = await this.eval('literal', value.arg, context, path, device);
        if (obj === undefined || obj === null) {
          return obj;
        }
        return JSON.stringify(obj);
      }
      case 'iterate':
      {
        const obj = {};
        const itr = value.arg;
        callContext.index = 0;
        callContext.key = null;
        callContext.limit = value.limit || Number.MAX_SAFE_INTEGER;
        while (callContext.index < callContext.limit) {
          let nvalue = await itr.call(callContext, callContext);
          if (!nvalue) {
            break;
          }
          try {
            let result = null;
            if (!Array.isArray(nvalue)) {
              nvalue = [ nvalue ];
            }
            if (nvalue.length === 1) {
              callContext.key = callContext.index;
              result = await this.eval(def$, nvalue[0], context, `${path}.${callContext.key}`, device);
            }
            else {
              callContext.key = await this.eval(def$, nvalue[0], context, path, device);
              if (callContext.key !== null && callContext.key !== undefined) {
                result = await this.eval(def$, nvalue[1], context, `${path}.${callContext.key}`, device);
              }
            }
            if (result == null || result === undefined || callContext.key === null || callContext.key === undefined) {
              break;
            }
            obj[callContext.key] = result;
            callContext.index++;
          }
          catch (_) {
            //Log(_);
            break;
          }
        }
        return obj;
      }
      case 'foreach':
      {
        const obj = {};
        const itr = value.arg;
        const keys = device.readKV(path, Object.assign({ depth: 1 }, value.options));
        callContext.index = 0;
        for (let key in keys) {
          callContext.key = key;
          callContext.parent = path;
          callContext.path = `${path}.${key}`;
          let result = null;
          let nvalue = await itr.call(callContext, callContext);
          if (!nvalue) {
            break;
          }
          try {
            if (!Array.isArray(nvalue)) {
              nvalue = [ nvalue ];
            }
            if (nvalue.length == 1) {
              result = await this.eval(def$, nvalue[0], context, `${path}.${key}`, device);
            }
            else {
              key = await this.eval(def$, nvalue[0], context, path, device);
              if (key === null || key === undefined) {
                break;
              }
              result = await this.eval(def$, nvalue[1], context, `${path}.${key}`, device);
            }
            if (result == null || result === undefined) {
              break;
            }
            obj[key] = result;
            callContext.index++;
          }
          catch (_) {
            Log(_);
            break;
          }
        }
        return obj;
      }
      case 'fn':
      {
        try {
          return await value.arg.call(callContext, callContext);
        }
        catch (e) {
          Log(e);
          throw e;
        }
      }
      case 'guard':
      {
        let valid = false;
        let key = path;
        if ('key' in value) {
          key = await this.eval('literal', value.key, context, path, device);
        }
        if (typeof key === 'string') {
          key = key.split(',');
          for (let k = 0; k < key.length; k++) {
            const kv = device.readKV(key[k], { info: true, value: false });
            if (kv && kv.modified) {
              valid = true;
              break;
            }
          }
        }
        else if (typeof key === 'boolean') {
          valid = key;
        }
        if (valid) {
          return this.eval(def$, value.arg, context, path, device);
        }
        return false;
      }
      case 'navigate':
      {
        const frame = await this.getEvalFrame(context, value);
        if (!value.arg) {
          throw new Error('Missing arg in navigate');
        }
        let url = (new URL(await this.eval('literal', value.arg, frame, path, device), frame.url())).toString();
        if (value.params) {
          const p = {};
          // Evaluate each paramater in turn (otherwise the 'path' will be wrong)
          for (let key in value.params) {
            const val = await this.eval('literal', value.params[key], frame, path, device);
            if (val !== undefined && val !== null) {
              p[key] = val;
            }
          }
          const params = [];
          for (let key in p) {
            params.push(`${encodeURIComponent(key)}=${encodeURIComponent(p[key])}`);
          }
          url = `${url}?${params.join('&')}`;
        }
        const timeout = value.timeout || TIMEOUT.frameNavigation;

        let response;
        try {
          LogNav('goto:', url);
          response = await frame.goto(url, { timeout: timeout, waitUntil: 'networkidle2' });
          LogNav('goneto:', url, response.ok());
        }
        catch (e) {
          Log(e);
          throw new Error(`navigation failed: ${url} - ${e}`);
        }
        if (!response.ok()) {
          throw new Error(`navigation failed: ${url} - ${response.statusText()}`);
        }
        if (value.values) {
          return await this.eval(value.type || 'selector', value.values, frame, path, device);
        }
        return true;
      }
      case 'fetch':
      {
        const frame = await this.getEvalFrame(context, value);
        if (!value.arg) {
          throw new Error('Missing arg in fetch');
        }
        let url = (new URL(await this.eval('literal', value.arg, frame, path, device), frame.url())).toString();
        const method = (value.method || 'GET').toUpperCase();

        let body = null;
        let contentType = null;

        if (value.params) {
          try {
            let vals = {};
            if ('$' in value.params) {
              vals = await this.eval('literal', value.params, frame, path, device);
            }
            else {
              // Evaluate each paramater in turn (otherwise the 'path' will be wrong)
              for (let key in value.params) {
                const val = await this.eval('literal', value.params[key], frame, path, device);
                if (val !== undefined && val !== null) {
                  vals[key] = val;
                }
              }
              Log(vals);
            }
            if (typeof vals === 'string') {
              body = vals;
            }
            else {
              body = [];
              for (let key in vals) {
                body.push(`${encodeURIComponent(key)}=${encodeURIComponent(vals[key])}`);
              }
              body = body.join('&');
            }
            if (method === 'GET') {
              if (body.length) {
                url = `${url}?${body}`;
              }
              body = null;
            }
            else {
              contentType = 'application/x-www-form-urlencoded';
            }
          }
          catch (_) {
            Log(_);
          }
        }

        const wait = ('wait' in value) ? value.wait : true;

        let nvalue;
        try {
          LogNav('fetch:', url, method, body, contentType);
          nvalue = await frame.evaluate(async (url, method, contentType, body, wait) => {
            const options = {
              method: method,
              headers: {}
            };
            if (contentType) {
              options.headers['Content-Type'] = contentType;
            }
            if (body) {
              options.body = body;
            }
            let response = fetch(url, options);
            if (wait === true) {
              response = await response;
              if (response.ok) {
                return await response.text();
              }
              throw Error(`Fail ${response.status}`);
            }
            else {
              await new Promise(resolve => setTimeout(resolve, wait * 1000));
              return true;
            }
          }, url, method, contentType, body, wait);
          LogNav('fetched:', nvalue);
        }
        catch (e) {
          LogNav('fetch failed:');
          LogNav(e);
          throw e;
        }
        if (!value.values) {
          return true;
        }
        let type = value.type;
        if (!type) {
          switch (Path.extname((new URL(url)).pathname)) {
            case '.json':
              type = 'jsonp';
              break;
            case '.html':
            case '.htm':
              type = 'selector';
              break;
            case '.js':
            default:
              type = 'eval';
              break;
          }
        }
        let ncontext = frame;
        switch (type) {
          case 'jsonp':
            ncontext = JSON.parse(nvalue);
            break;
          case 'eval+r':
            await ncontext.evaluate(`$R=${nvalue}`);
            type = 'eval';
            break;
          case 'eval':
            await ncontext.evaluate(nvalue);
            break;
          case 'selector':
            await ncontext.setContent(nvalue, { timeout: TIMEOUT.frameNavigation, waitUntil: 'networkidle2' });
            break;
          default:
            break;
        }
        return await this.eval(type, value.values, ncontext, path, device);
      }
      case 'oid':
      {
        const oid = await this.eval('literal', value.arg, context, path, device);
        const session = device.getSNMPSession();
        if ('values' in value) {
          // Subtree
          const ncontext = await new Promise(resolve => {
            const v = {};
            function add(oid, val) {
              const p = oid.split('.');
              let t = v;
              for (let i = 0; i < p.length - 1; i++) {
                t = t[p[i]] || (t[p[i]] = {});
              }
              t[p[p.length - 1]] = val;
            }
            session.subtree(oid,
              varbinds => {
                //Log('varbinds:', varbinds);
                varbinds.forEach(varbind => add(varbind.oid, this.convertFromVarbind(varbind)));
              },
              () => {
                resolve(v);
              }
            );
          });
          Log('varbinds:', JSON.stringify(ncontext, null, 1));
          return await this.eval('jsonp', value.values, ncontext, path, device);
        }
        else {
          // Single
          const varbind = await new Promise((resolve, reject) => {
            session.get([ oid ], (err, varbinds) => {
              if (err) {
                return reject(err);
              }
              resolve(varbinds[0]);
            });
          });
          Log('varbind:', varbind);
          return this.map(value, this.convertFromVarbind(varbind));
        }
      }
      case 'oid+set':
      {
        let nvalue = '';
        if ('value' in value) {
          nvalue = await this.eval(def$, value.value, frame, path, device);
        }
        else {
          nvalue = await this.eval('kv', path, frame, path, device);
        }
        nvalue = await this.map(value, nvalue);
        let type;
        if ('type' in value) {
          type = SNMP.ObjectType[value.type];
        }
        else switch (typeof nvalue) {
          case 'number':
            type = SNMP.ObjectType.Integer;
            break;
          case 'boolean':
            type = SNMP.ObjectType.Boolean;
            break;
          case 'string':
          default:
            type = SNMP.ObjectType.OctetString;
            break;
        }
        const varbind = {
          oid: await this.eval('literal', value.arg, context, path, device),
          type: type,
          value: nvalue
        };
        return await new Promise((resolve, reject) => {
          device.getSNMPSession().set([ varbind ], (err, varbinds) => {
            if (err) {
              return reject(err);
            }
            if (SNMP.isVarbindError(varbinds[0])) {
              return reject(SNMP.varbindError(varbinds[0]));
            }
            resolve(true);
          });
        });
      }
      case 'frame':
      {
        const frame = await this.getEvalFrame(context, value);
        return await this.eval(def$, value.arg, frame, path, device);
      }
      case 'debug':
      {
        const frame = await this.getEvalFrame(context, value);
        switch (value.arg || 'content') {
          case 'content':
            console.log(await frame.content());
            break;
          default:
            break;
        }
        return true;
      }
      default:
        Log('Unknown $ directive', value.$);
        Log(new Error());
        break;
    }
    return null;
  }

  async getEvalFrame(context, value) {
    if (!('frame' in value)) {
      return context;
    }
    const name = value.frame;
    for (let p = context; p; p = context.parentFrame()) {
      context = p;
    }
    if (typeof name === 'number') {
      return context.childFrames()[name];
    }
    if (!name) {
      return context;
    }
    for (let retry = Math.ceil(TIMEOUT.frameNavigation / 1000); retry > 0; retry--) {
      //console.log(name, context.childFrames().map(f => f.name()));
      const frame = context.childFrames().find(frame => frame.name() === name);
      if (frame) {
        return frame;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('getEvalFrame timeout');
  }

  //
  // Get the named frame. We may need to wait for it to appear.
  //
  async getFrame(page, name) {
    return await this.getEvalFrame(page.mainFrame(), { frame: name });
  }

  async map(value, result) {
    if (value.map) {
      if (typeof value.map === 'function') {
        result = await value.map(result);
      }
      else {
        result = value.map[result];
      }
    }
    else {
      result = TypeConversion.toNatural(result);
    }
    if ('equals' in value) {
      return (result == value.equals);
    }
    return result;
  }

  merge(target, source) {
    if (Object(source) === source) {
      if (Object(target) === target) {
        for (let key in source) {
          if (key in target) {
            target[key] = this.merge(target[key], source[key]);
          }
          else {
            target[key] = source[key];
          }
        }
      }
      return target;
    }
    return source;
  }

  convertFromVarbind(varbind) {
    switch (varbind.type) {
      case SNMP.ObjectType.OctetString:
        return varbind.value.toString('ascii');
      case SNMP.ObjectType.Integer:
      case SNMP.ObjectType.ObjectIdentifier:
      case SNMP.ObjectType.TimeTicks:
      case SNMP.ObjectType.Guage:
      default:
        return varbind.value;
    }
  }

}

module.exports = new Eval();
