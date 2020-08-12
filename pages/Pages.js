const FS = require('fs');
const Path = require('path');

const CACHE_MAXAGE = 24 * 60 * 60; // 24 hours
const DEBUG = true;

const Pages = {
  '/':                require('./Main')
};

const JSPages = {
  '/js/script.js':      `${__dirname}/script.js`,
  '/js/jquery.js':      `${__dirname}/../node_modules/jquery/dist/jquery.js`,
  '/js/bootstrap.js':   `${__dirname}/../node_modules/bootstrap/dist/js/bootstrap.bundle.js`,
  '/js/plotly.js':      `${__dirname}/../node_modules/plotly.js-dist/plotly.js`,
  '/js/sortable.js':    `${__dirname}/../node_modules/sortablejs/Sortable.min.js`,
  '/js/dx.all.js':      `${__dirname}/../node_modules/devextreme/dist/js/dx.all.js`
};

const CSSPages = {
  '/css/main.css':      `${__dirname}/main.css`,
  '/css/bootstrap.css': `${__dirname}/../node_modules/bootstrap/dist/css/bootstrap.css`,
  '/css/dx.common.css': `${__dirname}/../node_modules/devextreme/dist/css/dx.common.css`,
  '/css/dx.dark.css':   `${__dirname}/../node_modules/devextreme/dist/css/dx.dark.css`
};


function Register(root, wsroot) {

  for (let key in JSPages) {
    const file = JSPages[key];
    if (DEBUG) {
      JSPages[key] = () => FS.readFileSync(file, { encoding: 'utf8' });
    }
    else {
      const contents = FS.readFileSync(file, { encoding: 'utf8' });
      JSPages[key] = () => contents;
    }
    root.get(key, async ctx => {
      ctx.body = JSPages[key]();
      ctx.type = 'text/javascript';
      if (!DEBUG) {
        ctx.cacheControl = { maxAge: CACHE_MAXAGE };
      }
    });
  }

  for (let key in CSSPages) {
    const file = CSSPages[key];
    if (DEBUG) {
      CSSPages[key] = () => FS.readFileSync(file, { encoding: 'utf8' });
    }
    else {
      const contents = FS.readFileSync(file, { encoding: 'utf8' });
      CSSPages[key] = () => contents;
    }
    root.get(key, async (ctx) => {
      ctx.body = CSSPages[key]();
      ctx.type = 'text/css';
      if (!DEBUG) {
        ctx.cacheControl = { maxAge: CACHE_MAXAGE };
      }
    });
  }

  for (let key in Pages) {
    if (Pages[key].HTML) {
      root.get(Path.normalize(key), Pages[key].HTML);
    }
    if (Pages[key].WS) {
      wsroot.get(Path.normalize(`${key}/ws`), Pages[key].WS);
    }
  }
}

module.exports = Register;
