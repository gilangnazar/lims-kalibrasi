const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supertest = require('supertest');
const app = require('../src/app');
const db = require('../src/db');
const env = require('../src/config/env');

const PASSWORD = 'password123';
let passwordHash;

// Child tables first so foreign keys never block the delete. System roles, menus and Admin's
// grants (from syncMenus in globalSetup) stay; grants given by tests and custom roles go.
async function resetDb() {
  for (const table of [
    'audit_logs',
    'attachments',
    'assignment_letters',
    'order_onsite_team',
    'order_onsite_visits',
    'contract_reviews',
    'order_items',
    'order_other_costs',
    'orders',
    'number_sequences',
    'equipment',
    'user_roles',
    'users',
    'customers',
    'standard_instruments',
    'methods'
  ]) {
    await db(table).del();
  }
  const admin = await db('roles').where({ name: 'Admin' }).first();
  await db('role_permissions').whereNot({ role_id: admin.id }).del();
  await db('roles').where({ is_system: false }).del();
}

let counter = 0;

/** Inserts a user with one role name (or an array of names) and returns { user, token }. */
async function createUser(roles = 'Admin', overrides = {}) {
  passwordHash ??= await bcrypt.hash(PASSWORD, 4);
  counter += 1;
  const row = {
    username: `user${counter}`,
    email: `user${counter}@example.com`,
    full_name: `User ${counter}`,
    password_hash: passwordHash,
    ...overrides
  };
  const [id] = await db('users').insert(row);
  const names = [roles].flat();
  const roleRows = await db('roles').whereIn('name', names);
  if (roleRows.length !== names.length) throw new Error(`createUser: unknown role in ${names.join(', ')}`);
  await db('user_roles').insert(roleRows.map((role) => ({ user_id: id, role_id: role.id })));
  const token = jwt.sign({ userId: id }, env.jwt.secret, { expiresIn: '1h' });
  return { user: { id, ...row }, token };
}

/** Grants "menu:action" permissions to a role (by name). */
async function grant(roleName, ...permissions) {
  const role = await db('roles').where({ name: roleName }).first();
  const menus = new Map((await db('menus').select('id', 'code')).map((menu) => [menu.code, menu.id]));
  const rows = permissions.map((permission) => {
    const [code, action] = permission.split(':');
    if (!menus.has(code)) throw new Error(`grant: unknown menu ${code}`);
    return { role_id: role.id, menu_id: menus.get(code), action };
  });
  await db('role_permissions').insert(rows).onConflict().ignore();
}

const api = () => supertest(app);

module.exports = { resetDb, createUser, grant, api, db, PASSWORD };
