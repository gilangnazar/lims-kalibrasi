const bcrypt = require('bcryptjs');
const { ROLES } = require('../src/config/roles');

// One demo user per staff role, for local click-throughs. Skipped in production.
// Same password as the admin (SEED_ADMIN_PASSWORD). Existing usernames are left untouched.
const DEMO_USERS = [
  { username: 'finance', full_name: 'Demo Finance', role: ROLES.FINANCE },
  { username: 'adminteknisi', full_name: 'Demo Admin Teknisi', role: ROLES.ADMIN_TEKNISI },
  { username: 'manajer', full_name: 'Demo Manajer Teknis', role: ROLES.MANAJER_TEKNIS },
  { username: 'teknisi', full_name: 'Demo Teknisi', role: ROLES.TEKNISI }
];

exports.seed = async (knex) => {
  if (process.env.NODE_ENV === 'production') return;

  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    throw new Error('Set SEED_ADMIN_PASSWORD in api/.env before running the seed.');
  }
  const password_hash = await bcrypt.hash(password, 10);

  for (const user of DEMO_USERS) {
    const existing = await knex('users').where({ username: user.username }).first();
    if (existing) continue;
    await knex('users').insert({ ...user, email: `${user.username}@example.com`, password_hash });
  }
};
