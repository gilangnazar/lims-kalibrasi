const bcrypt = require('bcryptjs');

// One demo user per staff role, plus a demo permission grid for those roles (PRD Appendix A, today's
// menus), for local click-throughs. Skipped in production, where only Admin has permissions and the
// lab ticks the other roles by hand. Same password as the admin (SEED_ADMIN_PASSWORD).
// Existing users and existing grants are left untouched.
const DEMO_USERS = [
  { username: 'finance', full_name: 'Demo Finance', role: 'Finance' },
  { username: 'adminteknisi', full_name: 'Demo Admin Teknisi', role: 'Admin Teknisi' },
  { username: 'manajer', full_name: 'Demo Manajer Teknis', role: 'Manajer Teknis' },
  { username: 'teknisi', full_name: 'Demo Teknisi', role: 'Teknisi' }
];

const LAB_READ = ['customers:view', 'standard-instruments:view', 'methods:view'];
const DEMO_GRANTS = {
  Finance: ['customers:view'],
  'Admin Teknisi': LAB_READ,
  'Manajer Teknis': LAB_READ,
  Teknisi: LAB_READ
};

exports.seed = async (knex) => {
  if (process.env.NODE_ENV === 'production') return;

  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    throw new Error('Set SEED_ADMIN_PASSWORD in api/.env before running the seed.');
  }
  const password_hash = await bcrypt.hash(password, 10);
  const roleId = async (name) => (await knex('roles').where({ name }).first()).id;

  for (const { role, ...user } of DEMO_USERS) {
    let existing = await knex('users').where({ username: user.username }).first();
    if (!existing) {
      const [id] = await knex('users').insert({ ...user, email: `${user.username}@example.com`, password_hash });
      existing = { id };
    }
    await knex('user_roles').insert({ user_id: existing.id, role_id: await roleId(role) }).onConflict().ignore();
  }

  const menuIds = new Map((await knex('menus').select('id', 'code')).map((menu) => [menu.code, menu.id]));
  for (const [role, grants] of Object.entries(DEMO_GRANTS)) {
    const id = await roleId(role);
    const rows = grants.map((grant) => {
      const [code, action] = grant.split(':');
      return { role_id: id, menu_id: menuIds.get(code), action };
    });
    await knex('role_permissions').insert(rows).onConflict().ignore();
  }
};
