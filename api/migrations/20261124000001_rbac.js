// P0.5 RBAC: DB-stored roles, multi-role users and a menu × action permission grid.
// Menus and Admin's grants are filled by syncMenus() (seed + API start), not here, so this
// migration never depends on app code. users.role is kept (nullable, unused) for one release.
const SYSTEM_ROLES = [
  { name: 'Admin', description: 'Akses penuh ke semua menu' },
  { name: 'Finance', description: 'Keuangan' },
  { name: 'Admin Teknisi', description: 'Penerimaan dan pemeriksaan alat' },
  { name: 'Manajer Teknis', description: 'Kaji ulang, penugasan, review, sertifikat' },
  { name: 'Teknisi', description: 'Pelaksanaan kalibrasi' },
  { name: 'Customer', description: 'Portal pelanggan', is_customer_scope: true }
];

function timestamps(knex, table) {
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
}

exports.up = async (knex) => {
  await knex.schema.createTable('roles', (table) => {
    table.increments('id');
    table.string('name', 50).notNullable().unique();
    table.string('description', 255).nullable();
    table.boolean('is_system').notNullable().defaultTo(false);
    table.boolean('is_customer_scope').notNullable().defaultTo(false);
    timestamps(knex, table);
  });

  await knex.schema.createTable('user_roles', (table) => {
    table.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE');
    table.integer('role_id').unsigned().notNullable().references('roles.id').onDelete('RESTRICT');
    table.primary(['user_id', 'role_id']);
  });

  await knex.schema.createTable('menus', (table) => {
    table.increments('id');
    table.string('code', 50).notNullable().unique();
    table.integer('parent_id').unsigned().nullable().references('menus.id').onDelete('SET NULL');
    table.string('label', 100).notNullable();
    table.integer('sort_order').notNullable().defaultTo(0);
    table.boolean('is_visible').notNullable().defaultTo(true);
    table.string('path', 150).nullable();
    table.json('actions').notNullable(); // allowed actions, e.g. ["view","add","edit","delete"]
    timestamps(knex, table);
  });

  await knex.schema.createTable('role_permissions', (table) => {
    table.integer('role_id').unsigned().notNullable().references('roles.id').onDelete('CASCADE');
    table.integer('menu_id').unsigned().notNullable().references('menus.id').onDelete('CASCADE');
    table.string('action', 20).notNullable();
    table.primary(['role_id', 'menu_id', 'action']);
  });

  await knex('roles').insert(SYSTEM_ROLES.map((role) => ({ is_customer_scope: false, ...role, is_system: true })));

  // Copy each user's single role into user_roles.
  await knex.raw(
    'INSERT INTO user_roles (user_id, role_id) SELECT u.id, r.id FROM users u JOIN roles r ON r.name = u.role'
  );

  await knex.schema.alterTable('users', (table) => {
    table.string('role', 50).nullable().alter(); // unused from P0.5; dropped in a later release
  });
};

exports.down = async (knex) => {
  // Restore users.role from the first assigned system role (custom roles have no equivalent).
  await knex.raw(`
    UPDATE users u
    JOIN (SELECT ur.user_id, MIN(r.id) AS role_id FROM user_roles ur JOIN roles r ON r.id = ur.role_id
          WHERE r.is_system = 1 GROUP BY ur.user_id) x ON x.user_id = u.id
    JOIN roles r ON r.id = x.role_id
    SET u.role = r.name`);
  await knex('users').whereNull('role').update({ role: 'Teknisi' });
  await knex.schema.alterTable('users', (table) => {
    table.enu('role', ['Admin', 'Finance', 'Admin Teknisi', 'Manajer Teknis', 'Teknisi', 'Customer']).notNullable().alter();
  });
  for (const table of ['role_permissions', 'menus', 'user_roles', 'roles']) {
    await knex.schema.dropTableIfExists(table);
  }
};
