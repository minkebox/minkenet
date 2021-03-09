const FS = require('fs');
const Path = require('path');

const CACHE_MAXAGE = 0;// 24 * 60 * 60; // 24 hours

const Main = require('./Main');
const Pages = {
  '/':                  { fn: Main.HTML },
  '/ws':                { fn: Main.WS },
  '/js/script.js':      { path: `${__dirname}/script.js`, type: 'text/javascript' },
  '/js/jquery.js':      { path: `${__dirname}/../node_modules/jquery/dist/jquery.js`, type: 'text/javascript' },
  '/js/bootstrap.js':   { path: `${__dirname}/../node_modules/bootstrap/dist/js/bootstrap.bundle.js`, type: 'text/javascript' },
  '/js/sortable.js':    { path: `${__dirname}/../node_modules/sortablejs/modular/sortable.esm.js`, type: 'text/javascript' },
  '/js/dx.all.js':      { path: `${__dirname}/../node_modules/devextreme/dist/js/dx.all.js`, type: 'text/javascript' },
  '/css/main.css':      { path: `${__dirname}/main.css`, type: 'text/css' },
  '/css/bootstrap.css': { path: `${__dirname}/../node_modules/bootstrap/dist/css/bootstrap.css`, type: 'text/css' },
  '/css/dx.common.css': { path: `${__dirname}/../node_modules/devextreme/dist/css/dx.common.css`, type: 'text/css' },
  '/css/dx.dark.css':   { path: `${__dirname}/../node_modules/devextreme/dist/css/dx.dark.css`, type: 'text/css' }
};


function Register(root, wsroot) {

  if (!process.env.DEBUG) {
    for (let name in Pages) {
      const page = Pages[name];
      if (page.fn) {
        page.get = page.fn;
      }
      else {
        const data = FS.readFileSync(page.path, { encoding: page.encoding || 'utf8' });
        page.get = async ctx => {
          ctx.body = data;
          ctx.type = page.type;
          if (CACHE_MAXAGE) {
            ctx.cacheControl = { maxAge: CACHE_MAXAGE };
          }
        }
      }
    }
  }
  else {
    for (let name in Pages) {
      const page = Pages[name];
      if (page.fn) {
        page.get = page.fn;
      }
      else {
        page.get = async ctx => {
          ctx.body = FS.readFileSync(page.path, { encoding: page.encoding || 'utf8' });
          ctx.type = page.type;
        }
      }
    }
  }

  for (let name in Pages) {
    if (name.endsWith('/ws')) {
      wsroot.get(name, Pages[name].get);
    }
    else {
      root.get(name, Pages[name].get);
    }
  }

}

module.exports = Register;
