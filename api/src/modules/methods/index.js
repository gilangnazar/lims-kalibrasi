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

const optionalText = (max) => z.string().trim().max(max).nullable().optional();
const fields = z.object({
  code: z.string().trim().max(30).nullable().optional(),
  name: z.string().trim().min(1).max(150),
  description: optionalText(2000),
  parameter_schema: z.array(parameter).min(1, 'Minimal satu parameter').max(50),
  // P1–P3: the result template in code, certificate remarks and the extra instrument fields on the request.
  template_key: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/, 'Hanya huruf kecil, angka, garis bawah')
    .max(50)
    .nullable()
    .optional(),
  reference: optionalText(2000),
  uncertainty_reference: optionalText(2000),
  remarks: z.array(z.string().trim().min(1).max(1000)).max(10).nullable().optional(),
  extra_spec_fields: z.array(z.string().trim().min(1).max(50)).max(10).nullable().optional(),
  is_accredited: z.boolean().optional()
});

// ---- service
const TABLE = 'methods';
const JSON_COLUMNS = ['parameter_schema', 'remarks', 'extra_spec_fields'];

// mysql2 usually parses JSON columns, but be defensive in case a driver setting returns a string.
const parse = (row) => {
  if (!row) return row;
  const out = { ...row, is_accredited: Boolean(row.is_accredited) };
  for (const key of JSON_COLUMNS) if (typeof out[key] === 'string') out[key] = JSON.parse(out[key]);
  return out;
};

const serialize = (input) => {
  const out = { ...input };
  for (const key of JSON_COLUMNS) if (out[key] !== undefined && out[key] !== null) out[key] = JSON.stringify(out[key]);
  return out;
};

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
