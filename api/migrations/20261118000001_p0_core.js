const ROLES = ['Admin', 'Finance', 'Admin Teknisi', 'Manajer Teknis', 'Teknisi', 'Customer'];

// created_at / updated_at with MySQL-maintained defaults (knex's timestamps() doesn't auto-update).
function timestamps(knex, table) {
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
}

exports.up = async (knex) => {
  await knex.schema.createTable('customers', (table) => {
    table.increments('id');
    table.string('code', 20).unique(); // generated after insert, e.g. CUST-0001
    table.string('company_name', 150).notNullable();
    table.string('pic_name', 100).notNullable();
    table.string('email', 150).notNullable();
    table.string('phone', 30).notNullable();
    table.text('address').notNullable();
    timestamps(knex, table);
    table.timestamp('deleted_at').nullable();
    table.index('company_name');
  });

  await knex.schema.createTable('users', (table) => {
    table.increments('id');
    table.string('username', 50).notNullable().unique();
    table.string('email', 150).notNullable();
    table.string('full_name', 100).notNullable();
    table.string('password_hash', 100).notNullable();
    table.enu('role', ROLES).notNullable();
    table.integer('customer_id').unsigned().nullable().references('customers.id').onDelete('RESTRICT');
    table.boolean('is_active').notNullable().defaultTo(true);
    timestamps(knex, table);
  });

  await knex.schema.createTable('standard_instruments', (table) => {
    table.increments('id');
    table.string('name', 150).notNullable();
    table.string('brand', 100).notNullable();
    table.string('model', 100).nullable();
    table.string('serial_number', 100).notNullable().unique();
    table.enu('status', ['aktif', 'tidak aktif']).notNullable().defaultTo('aktif');
    table.date('last_calibrated_at').nullable();
    table.date('due_date').nullable();
    timestamps(knex, table);
  });

  await knex.schema.createTable('methods', (table) => {
    table.increments('id');
    table.string('code', 30).nullable().unique();
    table.string('name', 150).notNullable();
    table.text('description').nullable();
    table.json('parameter_schema').notNullable(); // [{ name, unit }]
    timestamps(knex, table);
  });

  await knex.schema.createTable('audit_logs', (table) => {
    table.bigIncrements('id');
    table.integer('user_id').unsigned().nullable().references('users.id').onDelete('SET NULL');
    table.string('action', 30).notNullable(); // create | update | delete | login | ...
    table.string('entity', 50).notNullable();
    table.integer('entity_id').unsigned().nullable();
    table.json('changes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.index(['entity', 'entity_id']);
  });
};

exports.down = async (knex) => {
  for (const table of ['audit_logs', 'methods', 'standard_instruments', 'users', 'customers']) {
    await knex.schema.dropTableIfExists(table);
  }
};
