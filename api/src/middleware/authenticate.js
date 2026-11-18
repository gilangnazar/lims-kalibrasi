const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../db');
const AppError = require('../lib/AppError');

// Verifies the bearer token, then reloads the user so role changes and deactivation apply immediately.
async function authenticate(req, _res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw AppError.unauthorized('Token tidak ditemukan');

  let payload;
  try {
    payload = jwt.verify(token, env.jwt.secret);
  } catch {
    throw AppError.unauthorized('Token tidak valid atau kedaluwarsa');
  }

  const user = await db('users')
    .select('id', 'username', 'email', 'full_name', 'role', 'customer_id')
    .where({ id: payload.userId, is_active: true })
    .first();
  if (!user) throw AppError.unauthorized('Akun tidak aktif');

  req.user = user;
  next();
}

module.exports = authenticate;
