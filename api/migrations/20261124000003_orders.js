// P1 Orders & intake: customer equipment registry, orders (from the request), items (one row = one
// unit = one certificate), other costs, Kaji Ulang, on-site plan, Surat Tugas, attachments, yearly
// number sequences and lab settings. Also the method columns the request and certificate need.

// Lab identity from the sample certificate header (2026-11-23) and tax rates (2026-11-19).
const SETTINGS = {
  lab_name: 'PT LICHEM TEKNOLOGI KALIBRASI',
  lab_address: 'Taman Kenari Blok VII. A No. 12A, RT.01/RW.11, Desa Puspasari, Kecamatan Citeureup, Bogor 16810',
  lab_phone: '021 8908 3135',
  lab_email: 'cs.kalibrasi@lichemindo.com',
  lab_city: 'Bogor',
  lab_accreditation_no: '',
  lab_place_label: 'Lab. Lichem Teknologi Kalibrasi',
  ppn_rate: '11',
  pph23_rate: '2'
};

const ORDER_STATUSES = ['requested', 'reviewed', 'quoted', 'confirmed', 'dp_paid', 'in_progress', 'completed', 'closed', 'cancelled'];
const ITEM_STATUSES = [
  'pending',
  'received',
  'checked',
  'agreed',
  'assigned',
  'calibrating',
  'in_review',
  'rejected',
  'approved',
  'certified',
  'returned',
  'cancelled'
];

function timestamps(knex, table) {
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  table.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
}

exports.up = async (knex) => {
  await knex.schema.alterTable('methods', (table) => {
    table.string('template_key', 50).nullable(); // result template in code (api/src/result-templates/<key>.js)
    table.text('reference').nullable(); // acuan metode
    table.text('uncertainty_reference').nullable();
    table.json('remarks').nullable(); // extra remark lines on the certificate
    table.json('extra_spec_fields').nullable(); // extra instrument fields on the request, e.g. ["Volume"]
    table.boolean('is_accredited').notNullable().defaultTo(false);
  });

  await knex.schema.createTable('settings', (table) => {
    table.string('key', 50).primary();
    table.text('value').nullable();
    timestamps(knex, table);
  });
  await knex('settings').insert(Object.entries(SETTINGS).map(([key, value]) => ({ key, value })));

  // Yearly sequences for document numbers (order, Surat Tugas, …), locked row by row.
  await knex.schema.createTable('number_sequences', (table) => {
    table.string('name', 30).notNullable();
    table.integer('year').notNullable();
    table.integer('last_value').notNullable().defaultTo(0);
    table.primary(['name', 'year']);
  });

  await knex.schema.createTable('equipment', (table) => {
    table.increments('id');
    table.integer('customer_id').unsigned().notNullable().references('customers.id').onDelete('RESTRICT');
    table.string('name', 150).notNullable();
    table.string('brand', 100).nullable();
    table.string('model', 100).nullable();
    table.string('serial_number', 100).nullable();
    table.string('identity_no', 100).nullable();
    table.string('range', 100).nullable(); // Kapasitas
    table.string('resolution', 100).nullable(); // Ketelitian
    timestamps(knex, table);
    table.index(['customer_id', 'name']);
  });

  await knex.schema.createTable('orders', (table) => {
    table.increments('id');
    table.string('order_no', 30).notNullable().unique();
    table.integer('customer_id').unsigned().notNullable().references('customers.id').onDelete('RESTRICT');
    table.enu('status', ORDER_STATUSES).notNullable().defaultTo('requested');
    table.timestamp('requested_at').notNullable().defaultTo(knex.fn.now());
    table.string('contact_name', 100).nullable();
    table.string('contact_phone', 30).nullable();
    table.string('contact_email', 150).nullable();
    table.string('certificate_name', 150).notNullable(); // printed on the certificate
    table.text('certificate_address').notNullable();
    table.boolean('calibrated_before').notNullable().defaultTo(false);
    table.boolean('apply_ppn').notNullable().defaultTo(true);
    table.boolean('apply_pph23').notNullable().defaultTo(false);
    table.text('request_notes').nullable();
    table.string('po_no', 100).nullable();
    table.date('po_date').nullable();
    table.date('due_at').nullable();
    table.text('notes').nullable();
    table.text('cancel_reason').nullable();
    table.integer('created_by').unsigned().nullable().references('users.id').onDelete('SET NULL');
    timestamps(knex, table);
    table.index('status');
    table.index('customer_id');
  });

  await knex.schema.createTable('order_other_costs', (table) => {
    table.increments('id');
    table.integer('order_id').unsigned().notNullable().references('orders.id').onDelete('CASCADE');
    table.string('description', 255).notNullable();
    table.decimal('qty', 10, 2).notNullable().defaultTo(1);
    table.string('unit', 30).nullable();
  });

  await knex.schema.createTable('order_items', (table) => {
    table.increments('id');
    table.integer('order_id').unsigned().notNullable().references('orders.id').onDelete('CASCADE');
    table.integer('item_no').notNullable(); // 1, 2… — part of the certificate number
    table.integer('equipment_id').unsigned().nullable().references('equipment.id').onDelete('SET NULL');
    table.integer('method_id').unsigned().notNullable().references('methods.id').onDelete('RESTRICT');
    // Snapshot of the instrument at entry, so an issued certificate never changes.
    table.string('instrument_name', 150).notNullable();
    table.string('brand', 100).nullable();
    table.string('model', 100).nullable();
    table.string('serial_number', 100).nullable();
    table.string('identity_no', 100).nullable();
    table.string('range', 100).nullable();
    table.string('resolution', 100).nullable();
    table.json('extra_specs').nullable(); // keys = the method's extra_spec_fields
    table.string('calibration_point', 255).nullable(); // Titik Ukur
    table.string('usage_range', 255).nullable(); // Rentang pemakaian
    table.string('calibration_place', 255).nullable();
    table.enu('location', ['in_lab', 'on_site']).notNullable();
    table.enu('status', ITEM_STATUSES).notNullable().defaultTo('pending');
    table.integer('assigned_to').unsigned().nullable().references('users.id').onDelete('SET NULL');
    table.enu('received_condition', ['baik', 'tidak_baik']).nullable();
    table.text('accessories').nullable();
    table.text('check_notes').nullable();
    table.timestamp('received_at').nullable();
    table.timestamp('checked_at').nullable();
    table.boolean('customer_agreed').nullable();
    table.timestamp('customer_agreed_at').nullable();
    timestamps(knex, table);
    table.unique(['order_id', 'item_no']);
    table.index('status');
    table.index('assigned_to');
  });

  await knex.schema.createTable('contract_reviews', (table) => {
    table.increments('id');
    table.integer('order_id').unsigned().notNullable().unique().references('orders.id').onDelete('CASCADE');
    table.integer('reviewer_id').unsigned().nullable().references('users.id').onDelete('SET NULL');
    table.enu('decision', ['accepted', 'not_accepted']).notNullable();
    table.json('checklist').notNullable(); // [{ order_item_id, scope_ok, method_ok, standards_ok }]
    table.text('notes').nullable();
    table.timestamp('reviewed_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('order_onsite_visits', (table) => {
    table.increments('id');
    table.integer('order_id').unsigned().notNullable().references('orders.id').onDelete('CASCADE');
    table.string('location', 255).notNullable();
    table.date('visit_start').notNullable();
    table.date('visit_end').notNullable();
  });

  await knex.schema.createTable('order_onsite_team', (table) => {
    table.integer('order_id').unsigned().notNullable().references('orders.id').onDelete('CASCADE');
    table.integer('user_id').unsigned().notNullable().references('users.id').onDelete('RESTRICT');
    table.primary(['order_id', 'user_id']);
  });

  await knex.schema.createTable('assignment_letters', (table) => {
    table.increments('id');
    table.string('letter_no', 30).notNullable().unique();
    table.integer('order_id').unsigned().notNullable().unique().references('orders.id').onDelete('CASCADE');
    table.integer('issued_by').unsigned().nullable().references('users.id').onDelete('SET NULL');
    table.timestamp('issued_at').notNullable().defaultTo(knex.fn.now());
    table.string('file_path', 255).nullable(); // PDF from step 05
  });

  await knex.schema.createTable('attachments', (table) => {
    table.increments('id');
    table.string('entity', 50).notNullable(); // orders | order_items | …
    table.integer('entity_id').unsigned().notNullable();
    table.string('kind', 30).notNullable(); // po | item_photo | client_signature | …
    table.string('path', 255).notNullable(); // relative to UPLOAD_DIR
    table.string('original_name', 255).notNullable();
    table.string('mime', 100).notNullable();
    table.integer('size').unsigned().notNullable();
    table.integer('uploaded_by').unsigned().nullable().references('users.id').onDelete('SET NULL');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.index(['entity', 'entity_id', 'kind']);
  });
};

exports.down = async (knex) => {
  for (const table of [
    'attachments',
    'assignment_letters',
    'order_onsite_team',
    'order_onsite_visits',
    'contract_reviews',
    'order_items',
    'order_other_costs',
    'orders',
    'equipment',
    'number_sequences',
    'settings'
  ]) {
    await knex.schema.dropTableIfExists(table);
  }
  await knex.schema.alterTable('methods', (table) => {
    for (const column of ['template_key', 'reference', 'uncertainty_reference', 'remarks', 'extra_spec_fields', 'is_accredited']) {
      table.dropColumn(column);
    }
  });
};
