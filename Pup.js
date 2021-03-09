const Puppeteer = require('puppeteer');
const FS = require('fs');
const Log = require('debug')('pup');

const BROWSER_PATH = '/usr/bin/chromium-browser';

class Pup {

  async newPage() {
    if (!this._browser) {
      const options = {
        headless: true,
        ignoreHTTPSErrors: true,
        args: [
          '--no-sandbox',
          //'--disable-setuid-sandbox',
          //'--deterministic-fetch',
          '--disable-extensions',
          '--start-maximixed',
          '--no-zygote',
          '--no-proxy-server',
          '--disable-gpu',
          '--in-process-gpu',
          '--disable-dev-shm-usage',
          //'--proxy-server="direct://"',
          //'--proxy-bypass-list=*',
          '--user-data-dir=/tmp/pup'
        ],
        dumpio: true
      };
      if (FS.existsSync(BROWSER_PATH)) {
        options.executablePath = BROWSER_PATH;
      }
      this._browser = await Puppeteer.launch(options);
    }
    return await (await this._browser.createIncognitoBrowserContext()).newPage();
  }

  async connect(config) {
    const page = await this.newPage();
    config = Object.assign({
      abortTypes: { image: true, stylesheet: true, font: true }
    }, config);
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.61 Safari/537.36 Edg/83.0.478.37');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-us' });
    if (config.abortTypes) {
      await page.setRequestInterception(true);
      page.on('request', req => {
        const type = req.resourceType();
        if (config.abortTypes[type]) {
          Log('request aborted:', req.url(), type);
          req.abort();
        }
        else {
          req.continue();
        }
      });
    }
    if (Log.enabled) {
      page.on('pageerror', err => Log('page error:', err.toString()));
      page.on('error', err => Log('error:', err.toString()));
      page.on('console', msg => Log('console:', msg.text()));
      page.on('requestfinished', req => Log('requestfinished:', req.url()));
      page.on('requestfailed', req => Log('requestfailed:', req.url()));
      page.on('domcontentloaded', () => Log('domcontentloaded'));
      page.on('load', () => Log('load'));
      page.on('Xresponse', async res => {
        try {
          const data = await res.buffer();
          Log('response:', res.url());
          Log(`  body: ${data.toString()}`);
        }
        catch (_) {
          // Ignore errors caused by aborted requests
        }
      });
    }

    // Dismiss dialogs to they dont block the browser.
    page.on('dialog', async dialog => {
      dialog.dismiss();
    });
    return page;
  }

  disconnect(page) {
    page.close();
    page.removeAllListeners();
    page.browserContext().close();
  }

};

module.exports = new Pup();
