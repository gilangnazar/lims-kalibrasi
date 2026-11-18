const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supertest = require('supertest');
const app = require('../src/app');
const db = require('../src/db');
const env = require('../src/config/env');

const PASSWORD = 'password123';
let passwordHash;

// Child tables first so foreign keys never block the delete.
async function resetDb() {
  for (const table of ['audit_logs', 'users', 'customers', 'standard_instruments', 'methods']) {
    await db(table).del();
  }
}

let counter = 0;

/** Inserts a user with the given role and returns { user, token }. */
async function createUser(role = 'Admin', overrides = {}) {
  passwordHash ??= await bcrypt.hash(PASSWORD, 4);
  counter += 1;
  const row = {
    username: `user${counter}`,
    email: `user${counter}@example.com`,
    full_name: `User ${counter}`,
    password_hash: passwordHash,
    role,
    ...overrides
  };
  const [id] = await db('users').insert(row);
  const token = jwt.sign({ userId: id, role }, env.jwt.secret, { expiresIn: '1h' });
  return { user: { id, ...row }, token };
}

const api = () => supertest(app);

module.exports = { resetDb, createUser, api, db, PASSWORD };
