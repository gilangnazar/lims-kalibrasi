const { z } = require('zod');
const db = require('../../db');
const AppError = require('../../lib/AppError');
const audit = require('../../lib/audit');
const crudRouter = require('../../lib/crudRouter');
const { listQuery, applySearch, applySort, paginate } = require('../../lib/pagination');

// ---- schema
const isoDate = z.iso.date('Format tanggal YYYY-MM-DD').nullable();

const fields = z.object({
  name: z.string().trim().min(1).max(150),
  brand: z.string().trim().min(1).max(100),
  model: z.string().trim().max(100).nullable().optional(),
  serial_number: z.string().trim().min(1).max(100),
  status: z.enum(['aktif', 'tidak aktif']),
  last_calibrated_at: isoDate.optional(),
  due_date: isoDate.optional()
});

// Default only on create — a default inside .partial() would reset status on every update.
const createSchema = fields.extend({ status: fields.shape.status.default('aktif') });

const listSchema = listQuery.extend({ status: z.enum(['aktif', 'tidak aktif']).optional() });

// ---- service
const TABLE = 'standard_instruments';

const service = {
  async list({ page, limit, search, sort, status }) {
    const qb = db(TABLE).select('*');
    if (status) qb.where({ status });
    applySearch(qb, search, ['name', 'brand', 'model', 'serial_number']);
    applySort(qb, sort, ['name', 'brand', 'serial_number', 'status', 'due_date', 'created_at']);
    return paginate(qb, { page, limit });
  },

  async get(id) {
    const row = await db(TABLE).where({ id }).first();
    if (!row) throw AppError.notFound('Standard instrument tidak ditemukan');
    return row;
  },

  async create(input, actor) {
    const [id] = await db(TABLE).insert(input);
    await audit({ userId: actor.id, action: 'create', entity: TABLE, entityId: id, after: input });
    return service.get(id);
  },

  async update(id, input, actor) {
    const before = await service.get(id);
    if (Object.keys(input).length) {
      await db(TABLE).where({ id }).update(input);
      await audit({ userId: actor.id, action: 'update', entity: TABLE, entityId: id, before, after: input });
    }
    return service.get(id);
  },

  async remove(id, actor) {
    const before = await service.get(id);
    await db(TABLE).where({ id }).delete();
    await audit({ userId: actor.id, action: 'delete', entity: TABLE, entityId: id, before });
  }
};

module.exports = crudRouter({
  service,
  schemas: { list: listSchema, create: createSchema, update: fields.partial() },
  menu: 'standard-instruments'
});
