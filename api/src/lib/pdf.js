const puppeteer = require('puppeteer');

// One headless Chrome for the whole API, launched on first use. At most MAX_CONCURRENT renders run at
// once (research §3: 2–3 on a small VPS); the rest wait in line.
const MAX_CONCURRENT = 2;
let browserPromise = null;
let running = 0;
const queue = [];

function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer
      .launch({ headless: 'shell', args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'] })
      .then((browser) => {
        browser.on('disconnected', () => {
          browserPromise = null; // relaunch on the next render
        });
        return browser;
      })
      .catch((err) => {
        browserPromise = null;
        throw err;
      });
  }
  return browserPromise;
}

async function withSlot(fn) {
  if (running >= MAX_CONCURRENT) await new Promise((resolve) => queue.push(resolve));
  running += 1;
  try {
    return await fn();
  } finally {
    running -= 1;
    queue.shift()?.();
  }
}

/**
 * Renders a full HTML document to an A4 PDF (Buffer). Images must be inlined (data URIs): the page
 * never loads anything from the network.
 */
function renderPdf(html, { landscape = false, margin = { top: '12mm', bottom: '14mm', left: '14mm', right: '14mm' } } = {}) {
  return withSlot(async () => {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.setJavaScriptEnabled(false);
      await page.setRequestInterception(true);
      page.on('request', (request) => (request.url().startsWith('data:') ? request.continue() : request.abort()));
      await page.setContent(html, { waitUntil: 'load' });
      return Buffer.from(await page.pdf({ format: 'A4', landscape, margin, printBackground: true }));
    } finally {
      await page.close();
    }
  });
}

async function closeBrowser() {
  if (!browserPromise) return;
  const browser = await browserPromise.catch(() => null);
  browserPromise = null;
  await browser?.close();
}

module.exports = { renderPdf, closeBrowser };
