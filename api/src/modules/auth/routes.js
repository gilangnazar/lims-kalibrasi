const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const db = require('../../db');
const env = require('../../config/env');
const AppError = require('../../lib/AppError');
const audit = require('../../lib/audit');
const respond = require('../../lib/respond');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const users = require('../users/service');
const { password } = require('../users/schema');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skip: () => env.isTest,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new AppError(429, 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.'))
});

const loginBody = z.object({ username: z.string().trim().min(1), password: z.string().min(1) });

router.post('/login', loginLimiter, validate({ body: loginBody }), async (req, res) => {
  const { username, password: plain } = req.valid.body;
  const user = await db('users').where({ username }).first();
  const valid = user && user.is_active && (await bcrypt.compare(plain, user.password_hash));
  if (!valid) throw AppError.unauthorized('Username atau password salah');

  const token = jwt.sign({ userId: user.id, role: user.role }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
  await audit({ userId: user.id, action: 'login', entity: 'users', entityId: user.id });
  respond.ok(res, { token, user: await users.get(user.id) }, 'Login berhasil');
});

// JWTs are stateless: logout is handled by the client discarding the token.
router.post('/logout', (_req, res) => respond.ok(res, undefined, 'Logout berhasil'));

router.get('/me', authenticate, async (req, res) => {
  respond.ok(res, await users.get(req.user.id));
});

const changePasswordBody = z.object({ current_password: z.string().min(1), new_password: password });

router.post('/change-password', authenticate, validate({ body: changePasswordBody }), async (req, res) => {
  const { current_password, new_password } = req.valid.body;
  const user = await db('users').where({ id: req.user.id }).first();
  if (!(await bcrypt.compare(current_password, user.password_hash))) throw AppError.badRequest('Password saat ini salah');

  await db('users')
    .where({ id: user.id })
    .update({ password_hash: await bcrypt.hash(new_password, 10) });
  await audit({ userId: user.id, action: 'change_password', entity: 'users', entityId: user.id });
  respond.ok(res, undefined, 'Password berhasil diubah');
});

module.exports = router;
