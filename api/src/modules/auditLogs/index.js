const express = require('express');
const { z } = require('zod');
const db = require('../../db');
const AppError = require('../../lib/AppError');
const authenticate = require('../../middleware/authenticate');
const requirePermission = require('../../middleware/requirePermission');
const validate = require('../../middleware/validate');
const respond = require('../../lib/respond');
const { idParams } = require('../../lib/params');
const { listQuery, applySort, paginate } = require('../../lib/pagination');

// Read-only audit trail viewer (ISO 17025 §7.5 / §8.4): who changed what, with old and new values.
const listAudit = listQuery.extend({
  entity: z.string().trim().max(50).optional(),
  action: z.string().trim().max(30).optional(),
  user_id: z.coerce.number().int().positive().optional(),
  q: z.string().trim().max(100).optional() // text inside old or new values
});

const parseJson = (value) => (typeof value === 'string' ? JSON.parse(value) : value);
const toPublic = (row) => ({
  id: row.id,
  action: row.action,
  entity: row.entity,
  entity_id: row.entity_id,
  created_at: row.created_at,
  user: row.user_id ? { id: row.user_id, username: row.username, full_name: row.full_name } : null,
  ...(row.old_values !== undefined && { old_values: parseJson(row.old_values), new_values: parseJson(row.new_values) })
});

const base = () =>
  db('audit_logs as a')
    .leftJoin('users as u', 'u.id', 'a.user_id')
    .select('a.id', 'a.action', 'a.entity', 'a.entity_id', 'a.created_at', 'a.user_id', 'u.username', 'u.full_name');

const router = express.Router();
router.use(authenticate);

router.get('/', requirePermission('audit-trail', 'view'), validate({ query: listAudit }), async (req, res) => {
  const { page, limit, sort, entity, action, user_id: userId, q } = req.valid.query;
  const qb = base();
  if (entity) qb.where('a.entity', entity);
  if (action) qb.where('a.action', action);
  if (userId) qb.where('a.user_id', userId);
  if (q) {
    qb.where((inner) =>
      inner.whereRaw('CAST(a.old_values AS CHAR) LIKE ?', [`%${q}%`]).orWhereRaw('CAST(a.new_values AS CHAR) LIKE ?', [`%${q}%`])
    );
  }
  // Newest first by default; sort=created_at for oldest first.
  if (sort) applySort(qb, sort.replace(/^(-?)/, '$1a.'), ['a.created_at', 'a.entity', 'a.action'], 'a.id');
  else qb.orderBy('a.id', 'desc');
  const result = await paginate(qb, { page, limit });
  respond.list(res, { ...result, data: result.data.map(toPublic) });
});

// Options for the filter dropdowns: entities, events and users that appear in the log.
router.get('/filters', requirePermission('audit-trail', 'view'), async (_req, res) => {
  const [entities, actions, users] = await Promise.all([
    db('audit_logs').distinct('entity').orderBy('entity'),
    db('audit_logs').distinct('action').orderBy('action'),
    db('audit_logs as a').join('users as u', 'u.id', 'a.user_id').distinct('u.id', 'u.username', 'u.full_name').orderBy('u.username')
  ]);
  respond.ok(res, { entities: entities.map((row) => row.entity), actions: actions.map((row) => row.action), users });
});

router.get('/:id', requirePermission('audit-trail', 'view'), validate({ params: idParams }), async (req, res) => {
  const row = await base().select('a.old_values', 'a.new_values').where('a.id', req.valid.params.id).first();
  if (!row) throw AppError.notFound('Log tidak ditemukan');
  respond.ok(res, toPublic(row));
});

module.exports = router;
