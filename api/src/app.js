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

app.use('/api/auth', require('./modules/auth/routes'));
app.use('/api/users', require('./modules/users/routes'));
app.use('/api/customers', require('./modules/customers'));
app.use('/api/standard-instruments', require('./modules/standardInstruments'));
app.use('/api/methods', require('./modules/methods'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
