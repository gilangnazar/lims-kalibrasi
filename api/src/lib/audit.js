const db = require('../db');

// Records who changed what. Pass a transaction as `conn` when the change runs inside one.
async function audit({ userId, action, entity, entityId, changes }, conn = db) {
  await conn('audit_logs').insert({
    user_id: userId ?? null,
    action,
    entity,
    entity_id: entityId ?? null,
    changes: changes ? JSON.stringify(changes) : null
  });
}

module.exports = audit;
