const { z } = require('zod');
const db = require('../../db');
const AppError = require('../../lib/AppError');
const audit = require('../../lib/audit');
const crudRouter = require('../../lib/crudRouter');
const { listQuery, applySearch, applySort, paginate } = require('../../lib/pagination');

// Customer equipment registry. It only pre-fills order items; items keep their own snapshot.
const text = (max) => z.string().trim().max(max).nullable().optional();
const fields = z.object({
  customer_id: z.number().int().positive(),
  name: z.string().trim().min(1).max(150),
  brand: text(100),
  model: text(100),
  serial_number: text(100),
  identity_no: text(100),
  range: text(100),
  resolution: text(100)
});
const listEquipment = listQuery.extend({ customer_id: z.coerce.number().int().positive().optional() });

const TABLE = 'equipment';
const withCustomer = () =>
  db(`${TABLE} as e`).join('customers as c', 'c.id', 'e.customer_id').select('e.*', 'c.code as customer_code', 'c.company_name');

async function assertCustomer(customerId) {
  const customer = await db('customers').where({ id: customerId }).whereNull('deleted_at').first();
  if (!customer) throw AppError.badRequest('Pelanggan tidak ditemukan');
}

const service = {
  async list({ page, limit, search, sort, customer_id: customerId }) {
    const qb = withCustomer();
    if (customerId) qb.where('e.customer_id', customerId);
    applySearch(qb, search, ['e.name', 'e.brand', 'e.model', 'e.serial_number', 'e.identity_no', 'c.company_name']);
    applySort(qb, sort?.replace(/^(-?)/, '$1e.'), ['e.name', 'e.brand', 'e.created_at'], 'e.id');
    return paginate(qb, { page, limit });
  },

  async get(id) {
    const row = await withCustomer().where('e.id', id).first();
    if (!row) throw AppError.notFound('Alat tidak ditemukan');
    return row;
  },

  async create(input, actor) {
    await assertCustomer(input.customer_id);
    const [id] = await db(TABLE).insert(input);
    await audit({ userId: actor.id, action: 'create', entity: TABLE, entityId: id, after: input });
    return service.get(id);
  },

  async update(id, input, actor) {
    const before = await service.get(id);
    if (input.customer_id) await assertCustomer(input.customer_id);
    if (Object.keys(input).length) {
      await db(TABLE).where({ id }).update(input);
      await audit({ userId: actor.id, action: 'update', entity: TABLE, entityId: id, before, after: input });
    }
    return service.get(id);
  },

  async remove(id, actor) {
    const before = await service.get(id);
    await db(TABLE).where({ id }).delete(); // order items keep their snapshot (equipment_id → NULL)
    await audit({ userId: actor.id, action: 'delete', entity: TABLE, entityId: id, before });
  }
};

module.exports = crudRouter({
  service,
  schemas: { list: listEquipment, create: fields, update: fields.partial() },
  menu: 'equipment'
});
