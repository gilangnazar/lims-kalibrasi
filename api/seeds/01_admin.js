const bcrypt = require('bcryptjs');

// Creates the first Admin account. Safe to re-run: does nothing if "admin" already exists.
exports.seed = async (knex) => {
  const existing = await knex('users').where({ username: 'admin' }).first();
  if (existing) return;

  // Short passwords (e.g. "admin") are allowed for local dev only.
  const password = process.env.SEED_ADMIN_PASSWORD;
  const minLength = process.env.NODE_ENV === 'production' ? 8 : 1;
  if (!password || password.length < minLength) {
    throw new Error(`Set SEED_ADMIN_PASSWORD (min. ${minLength} characters) in api/.env before running the seed.`);
  }

  const [id] = await knex('users').insert({
    username: 'admin',
    email: 'admin@example.com',
    full_name: 'Administrator',
    password_hash: await bcrypt.hash(password, 10)
  });
  const admin = await knex('roles').where({ name: 'Admin' }).first();
  await knex('user_roles').insert({ user_id: id, role_id: admin.id });
};
