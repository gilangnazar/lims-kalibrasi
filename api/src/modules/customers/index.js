const { z } = require('zod');
const db = require('../../db');
const AppError = require('../../lib/AppError');
const audit = require('../../lib/audit');
const crudRouter = require('../../lib/crudRouter');
const { listQuery, applySearch, applySort, paginate } = require('../../lib/pagination');

// ---- schema
const fields = z.object({
  company_name: z.string().trim().min(1).max(150),
  pic_name: z.string().trim().min(1).max(100),
  email: z.email('Email tidak valid').max(150),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{6,30}$/, 'Nomor telepon tidak valid'),
  address: z.string().trim().min(1).max(1000)
});

// ---- service (customers are soft-deleted: deleted_at is set, rows stay for history)
const active = () => db('customers').whereNull('deleted_at');

const service = {
  async list({ page, limit, search, sort }) {
    const qb = active().select('*');
    applySearch(qb, search, ['code', 'company_name', 'pic_name', 'email']);
    applySort(qb, sort, ['code', 'company_name', 'pic_name', 'created_at']);
    return paginate(qb, { page, limit });
  },

  async get(id) {
    const row = await active().where({ id }).first();
    if (!row) throw AppError.notFound('Pelanggan tidak ditemukan');
    return row;
  },

  async create(input, actor) {
    const id = await db.transaction(async (trx) => {
      const [newId] = await trx('customers').insert(input);
      await trx('customers')
        .where({ id: newId })
        .update({ code: `CUST-${String(newId).padStart(4, '0')}` });
      await audit({ userId: actor.id, action: 'create', entity: 'customers', entityId: newId, changes: input }, trx);
      return newId;
    });
    return service.get(id);
  },

  async update(id, input, actor) {
    await service.get(id);
    if (Object.keys(input).length) {
      await db('customers').where({ id }).update(input);
      await audit({ userId: actor.id, action: 'update', entity: 'customers', entityId: id, changes: input });
    }
    return service.get(id);
  },

  async remove(id, actor) {
    await service.get(id);
    await db('customers').where({ id }).update({ deleted_at: db.fn.now() });
    await audit({ userId: actor.id, action: 'delete', entity: 'customers', entityId: id });
  }
};

module.exports = crudRouter({
  service,
  schemas: { list: listQuery, create: fields, update: fields.partial() },
  menu: 'customers'
});
