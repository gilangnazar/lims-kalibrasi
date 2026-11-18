const path = require('path');
const env = require('./src/config/env');

module.exports = {
  client: 'mysql2',
  // dateStrings: DATE columns come back as 'YYYY-MM-DD' instead of timezone-shifted Date objects.
  connection: { ...env.db, timezone: 'Z', charset: 'utf8mb4', dateStrings: ['DATE'] },
  pool: { min: 0, max: 10 },
  migrations: { directory: path.join(__dirname, 'migrations') },
  seeds: { directory: path.join(__dirname, 'seeds') }
};
