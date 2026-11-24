// P0.5 audit trail: old/new values instead of one `changes` column, plus indexes for the viewer
// (user_id already has the index its foreign key created).
exports.up = async (knex) => {
  await knex.schema.alterTable('audit_logs', (table) => {
    table.json('old_values').nullable();
    table.json('new_values').nullable();
  });
  await knex('audit_logs')
    .whereNotNull('changes')
    .update({ new_values: knex.ref('changes') });
  await knex.schema.alterTable('audit_logs', (table) => {
    table.dropColumn('changes');
    table.index('action');
    table.index('created_at');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('audit_logs', (table) => {
    table.json('changes').nullable();
  });
  await knex('audit_logs').update({ changes: knex.ref('new_values') });
  await knex.schema.alterTable('audit_logs', (table) => {
    table.dropIndex('action');
    table.dropIndex('created_at');
    table.dropColumn('old_values');
    table.dropColumn('new_values');
  });
};
