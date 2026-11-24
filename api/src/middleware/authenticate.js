const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../db');
const AppError = require('../lib/AppError');
const { rolesByUser, permissionsOf } = require('../lib/access');

// Verifies the bearer token, then reloads the user, roles and permissions on every request, so
// role/permission changes and deactivation apply immediately. The JWT carries only { userId }.
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
    .select('id', 'username', 'email', 'full_name', 'customer_id')
    .where({ id: payload.userId, is_active: true })
    .first();
  if (!user) throw AppError.unauthorized('Akun tidak aktif');

  const roles = (await rolesByUser([user.id])).get(user.id);
  req.user = {
    ...user,
    roles,
    permissions: await permissionsOf(user.id),
    isCustomerScope: roles.some((role) => role.is_customer_scope)
  };
  next();
}

module.exports = authenticate;
