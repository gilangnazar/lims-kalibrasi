const db = require('../db');

// Keys whose values never reach the audit log, at any depth (case-insensitive).
const REDACTED_KEYS = ['password', 'password_hash', 'token', 'refreshtoken', 'refresh_token', 'authorization', 'secret', 'jwt'];
const REDACTED = '[disembunyikan]';

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, REDACTED_KEYS.includes(key.toLowerCase()) ? REDACTED : redact(inner)])
    );
  }
  return value;
}

// MySQL returns booleans as 0/1 and JSON as strings in places: compare loosely, store as given.
const normalize = (value) => {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && /^[[{]/.test(value)) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value ?? null;
};
const same = (a, b) => JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));

/** For an update: only the keys of `after` whose value differs from `before`. */
function diff(before = {}, after = {}) {
  const oldValues = {};
  const newValues = {};
  for (const [key, value] of Object.entries(after)) {
    if (value === undefined || same(before[key], value)) continue;
    oldValues[key] = before[key] ?? null;
    newValues[key] = value;
  }
  return { oldValues, newValues };
}

const toJson = (values) => (values && Object.keys(values).length ? JSON.stringify(redact(values)) : null);

/**
 * Records who changed what. Pass `before` (row before the change) and/or `after` (new values):
 * create → after; delete → before; update → both, and only changed fields are stored.
 * Secrets are redacted. Pass a transaction as `conn` when the change runs inside one.
 * Returns false (and writes nothing) for an update that changed nothing.
 */
async function audit({ userId, action, entity, entityId, before, after }, conn = db) {
  let oldValues = before;
  let newValues = after;
  if (before && after) {
    ({ oldValues, newValues } = diff(before, after));
    if (!Object.keys(newValues).length) return false;
  }
  await conn('audit_logs').insert({
    user_id: userId ?? null,
    action,
    entity,
    entity_id: entityId ?? null,
    old_values: toJson(oldValues),
    new_values: toJson(newValues)
  });
  return true;
}

module.exports = audit;
module.exports.redact = redact;
module.exports.diff = diff;
module.exports.REDACTED = REDACTED;
