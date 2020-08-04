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
  '/js/sortable.js':    `${__dirname}/../node_modules/sortablejs/Sortable.min.js`
};

const CSSPages = {
  '/css/main.css': `${__dirname}/main.css`,
  '/css/bootstrap.css': `${__dirname}/../node_modules/bootstrap/dist/css/bootstrap.css`
};

const IMGPages = {
};

function Register(root, wsroot) {

  for (let key in JSPages) {
    //const body = FS.readFileSync(JSPages[key], { encoding: 'utf8' });
    root.get(key, async (ctx) => {
      const body = FS.readFileSync(JSPages[key], { encoding: 'utf8' });
      ctx.body = body;
      ctx.type = 'text/javascript';
      if (!DEBUG) {
        ctx.cacheControl = { maxAge: CACHE_MAXAGE };
      }
    });
  }

  for (let key in CSSPages) {
    //const body = FS.readFileSync(CSSPages[key], { encoding: 'utf8' });
    root.get(key, async (ctx) => {
      const body = FS.readFileSync(CSSPages[key], { encoding: 'utf8' });
      ctx.body = body;
      ctx.type = 'text/css';
      if (!DEBUG) {
        ctx.cacheControl = { maxAge: CACHE_MAXAGE };
      }
    });
  }

  for (let key in IMGPages) {
    //const body = FS.readFileSync(IMGPages[key], { encoding: 'utf8' });
    root.get(key, async (ctx) => {
      const body = FS.readFileSync(IMGPages[key], { encoding: 'utf8' });
      ctx.body = body;
      ctx.type = 'image/png';
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
