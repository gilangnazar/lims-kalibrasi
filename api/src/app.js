const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const respond = require('./lib/respond');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigins }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => respond.ok(res, undefined, 'Server is running'));

// Every protected route must have a requirePermission check (test/routeCoverage.test.js walks these).
const mounts = [
  ['/api/users', require('./modules/users/routes')],
  ['/api/roles', require('./modules/roles')],
  ['/api/menus', require('./modules/menus')],
  ['/api/customers', require('./modules/customers')],
  ['/api/standard-instruments', require('./modules/standardInstruments')],
  ['/api/methods', require('./modules/methods')]
];

app.use('/api/auth', require('./modules/auth/routes')); // public login + own-account routes
for (const [path, router] of mounts) app.use(path, router);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
module.exports.mounts = mounts;
