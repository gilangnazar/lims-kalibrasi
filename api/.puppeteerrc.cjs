const path = require('path');

// Keep Puppeteer's browser inside the app (api/.cache/puppeteer), not in the user's home folder.
// npm 12 blocks install scripts, so fetch it explicitly: `npm run pdf:install`.
module.exports = { cacheDirectory: path.join(__dirname, '.cache', 'puppeteer') };
