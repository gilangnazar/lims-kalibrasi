const os = require('os');
const env = require('./src/config/env');
const app = require('./src/app');

function getLanIp() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) if (iface.family === 'IPv4' && !iface.internal) return iface.address;
  }
  return 'localhost';
}

app.listen(env.port, '0.0.0.0', () => {
  console.log('✅ API running on:');
  console.log(`   Local:   http://localhost:${env.port}`);
  console.log(`   Network: http://${getLanIp()}:${env.port}`);
});
