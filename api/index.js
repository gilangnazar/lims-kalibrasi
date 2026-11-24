const os = require('os');
const env = require('./src/config/env');
const app = require('./src/app');
const db = require('./src/db');
const syncMenus = require('./src/lib/syncMenus');

function getLanIp() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) if (iface.family === 'IPv4' && !iface.internal) return iface.address;
  }
  return 'localhost';
}

async function start() {
  await syncMenus(db); // menu registry → DB; Admin keeps every action
  app.listen(env.port, '0.0.0.0', () => {
    console.log('✅ API running on:');
    console.log(`   Local:   http://localhost:${env.port}`);
    console.log(`   Network: http://${getLanIp()}:${env.port}`);
  });
}

start().catch((err) => {
  console.error('API failed to start:', err);
  process.exit(1);
});
