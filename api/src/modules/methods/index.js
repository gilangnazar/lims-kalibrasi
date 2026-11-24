const { z } = require('zod');
const db = require('../../db');
const AppError = require('../../lib/AppError');
const audit = require('../../lib/audit');
const crudRouter = require('../../lib/crudRouter');
const { listQuery, applySearch, applySort, paginate } = require('../../lib/pagination');

// ---- schema
// parameter_schema drives the calibration worksheet in P2: one entry per measured parameter.
const parameter = z.object({
  name: z.string().trim().min(1).max(100),
  unit: z.string().trim().max(30).default('')
});

const fields = z.object({
  code: z.string().trim().max(30).nullable().optional(),
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(2000).nullable().optional(),
  parameter_schema: z.array(parameter).min(1, 'Minimal satu parameter').max(50)
});

// ---- service
const TABLE = 'methods';

// mysql2 usually parses JSON columns, but be defensive in case a driver setting returns a string.
const parse = (row) =>
  row && { ...row, parameter_schema: typeof row.parameter_schema === 'string' ? JSON.parse(row.parameter_schema) : row.parameter_schema };

const serialize = (input) =>
  input.parameter_schema === undefined ? input : { ...input, parameter_schema: JSON.stringify(input.parameter_schema) };

const service = {
  async list({ page, limit, search, sort }) {
    const qb = db(TABLE).select('*');
    applySearch(qb, search, ['code', 'name', 'description']);
    applySort(qb, sort, ['code', 'name', 'created_at']);
    const result = await paginate(qb, { page, limit });
    return { ...result, data: result.data.map(parse) };
  },

  async get(id) {
    const row = await db(TABLE).where({ id }).first();
    if (!row) throw AppError.notFound('Metode tidak ditemukan');
    return parse(row);
  },

  async create(input, actor) {
    const [id] = await db(TABLE).insert(serialize(input));
    await audit({ userId: actor.id, action: 'create', entity: TABLE, entityId: id, after: input });
    return service.get(id);
  },

  async update(id, input, actor) {
    const before = await service.get(id);
    if (Object.keys(input).length) {
      await db(TABLE).where({ id }).update(serialize(input));
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
  schemas: { list: listQuery, create: fields, update: fields.partial() },
  menu: 'methods'
});
