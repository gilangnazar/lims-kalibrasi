const db = require('../../db');
const AppError = require('../../lib/AppError');
const audit = require('../../lib/audit');
const { nextNumber } = require('../../lib/numbering');
const { getSetting } = require('../../lib/settings');
const { saveAttachments } = require('../../lib/uploads');
const { applySearch, applySort, paginate } = require('../../lib/pagination');
const S = require('./status');

const json = (value) => (typeof value === 'string' ? JSON.parse(value) : value);
const bool = (value) => (value === null || value === undefined ? value : Boolean(value));

// ---- reads

function scoped(qb, user, column = 'o.customer_id') {
  // Portal (customer-scope) users only ever see their own company's orders.
  if (user?.isCustomerScope) qb.where(column, user.customer_id ?? 0);
  return qb;
}

async function list({ page, limit, search, sort, status, location, customer_id: customerId }, user) {
  const qb = db('orders as o')
    .join('customers as c', 'c.id', 'o.customer_id')
    .select(
      'o.id',
      'o.order_no',
      'o.status',
      'o.requested_at',
      'o.certificate_name',
      'o.customer_id',
      'c.code as customer_code',
      'c.company_name',
      db('order_items').whereRaw('order_items.order_id = o.id').count('*').as('item_count'),
      db('order_items').whereRaw("order_items.order_id = o.id AND order_items.location = 'on_site'").count('*').as('onsite_count')
    );
  scoped(qb, user);
  if (status) qb.where('o.status', status);
  if (customerId) qb.where('o.customer_id', customerId);
  if (location) qb.whereExists(db('order_items').whereRaw('order_items.order_id = o.id').where('location', location));
  applySearch(qb, search, ['o.order_no', 'c.company_name', 'o.certificate_name', 'o.po_no']);
  applySort(qb, sort?.replace(/^(-?)/, '$1o.'), ['o.order_no', 'o.requested_at', 'o.status'], 'o.id');
  const result = await paginate(qb, { page, limit });
  return {
    ...result,
    data: result.data.map((row) => ({ ...row, item_count: Number(row.item_count), onsite_count: Number(row.onsite_count) }))
  };
}

const ITEM_COLUMNS = [
  'i.*',
  'm.code as method_code',
  'm.name as method_name',
  'm.template_key',
  'm.extra_spec_fields as method_extra_spec_fields',
  'u.full_name as assigned_name'
];

function toItem(row) {
  return {
    ...row,
    extra_specs: json(row.extra_specs) ?? {},
    method_extra_spec_fields: json(row.method_extra_spec_fields) ?? [],
    customer_agreed: bool(row.customer_agreed)
  };
}

async function getOrderRow(id, user, conn = db) {
  const qb = conn('orders as o')
    .join('customers as c', 'c.id', 'o.customer_id')
    .select('o.*', 'c.code as customer_code', 'c.company_name', 'c.address as customer_address')
    .where('o.id', id);
  const order = await scoped(qb, user).first();
  if (!order) throw AppError.notFound('Order tidak ditemukan');
  return order;
}

async function get(id, user) {
  const order = await getOrderRow(id, user);
  const [items, otherCosts, review, visits, team, letter] = await Promise.all([
    db('order_items as i')
      .join('methods as m', 'm.id', 'i.method_id')
      .leftJoin('users as u', 'u.id', 'i.assigned_to')
      .select(ITEM_COLUMNS)
      .where('i.order_id', id)
      .orderBy('i.item_no'),
    db('order_other_costs').where({ order_id: id }).orderBy('id'),
    db('contract_reviews as r')
      .leftJoin('users as u', 'u.id', 'r.reviewer_id')
      .select('r.*', 'u.full_name as reviewer_name')
      .where('r.order_id', id)
      .first(),
    db('order_onsite_visits').where({ order_id: id }).orderBy('visit_start'),
    db('order_onsite_team as t')
      .join('users as u', 'u.id', 't.user_id')
      .select('u.id', 'u.full_name', 'u.username')
      .where('t.order_id', id),
    db('assignment_letters as l')
      .leftJoin('users as u', 'u.id', 'l.issued_by')
      .select('l.*', 'u.full_name as issued_by_name')
      .where('l.order_id', id)
      .first()
  ]);
  const itemIds = items.map((item) => item.id);
  const attachments = await db('attachments')
    .select('id', 'entity', 'entity_id', 'kind', 'original_name', 'mime', 'size', 'created_at')
    .where((qb) =>
      qb
        .where({ entity: 'orders', entity_id: id })
        .orWhere((inner) => inner.where('entity', 'order_items').whereIn('entity_id', itemIds.length ? itemIds : [0]))
    )
    .orderBy('id');

  return {
    ...order,
    calibrated_before: bool(order.calibrated_before),
    apply_ppn: bool(order.apply_ppn),
    apply_pph23: bool(order.apply_pph23),
    items: items.map((item) => ({
      ...toItem(item),
      attachments: attachments.filter((a) => a.entity === 'order_items' && a.entity_id === item.id)
    })),
    other_costs: otherCosts.map((cost) => ({ ...cost, qty: Number(cost.qty) })),
    contract_review: review ? { ...review, checklist: json(review.checklist) } : null,
    onsite: { visits, team },
    assignment_letter: letter ?? null,
    attachments: attachments.filter((a) => a.entity === 'orders')
  };
}

// ---- request

async function assertCustomer(customerId, conn = db) {
  const customer = await conn('customers').where({ id: customerId }).whereNull('deleted_at').first();
  if (!customer) throw AppError.badRequest('Pelanggan tidak ditemukan');
  return customer;
}

/** Validates request rows (methods, equipment of this customer, extra spec keys) and expands qty. */
async function buildItems(rows, customerId, startNo, conn = db) {
  const methods = await conn('methods').whereIn('id', [...new Set(rows.map((row) => row.method_id))]);
  const equipmentIds = rows.map((row) => row.equipment_id).filter(Boolean);
  const equipment = equipmentIds.length ? await conn('equipment').whereIn('id', equipmentIds) : [];
  const labPlace = await getSetting('lab_place_label', conn);

  const items = [];
  let itemNo = startNo;
  for (const [index, { qty = 1, extra_specs: extraSpecs, ...row }] of rows.entries()) {
    const method = methods.find((m) => m.id === row.method_id);
    if (!method)
      throw AppError.badRequest('Metode tidak ditemukan', [{ field: `items.${index}.method_id`, message: 'Metode tidak ditemukan' }]);
    if (row.equipment_id && !equipment.some((e) => e.id === row.equipment_id && e.customer_id === customerId)) {
      throw AppError.badRequest('Alat bukan milik pelanggan ini', [
        { field: `items.${index}.equipment_id`, message: 'Alat tidak ditemukan' }
      ]);
    }
    // Only the method's extra fields are kept (e.g. Volume for Enclosure).
    const allowed = json(method.extra_spec_fields) ?? [];
    const specs = Object.fromEntries(allowed.map((key) => [key, extraSpecs?.[key] ?? '']));
    for (let n = 0; n < qty; n += 1) {
      items.push({
        ...row,
        item_no: itemNo,
        extra_specs: JSON.stringify(specs),
        calibration_place: row.location === 'in_lab' ? labPlace : null
      });
      itemNo += 1;
    }
  }
  return items;
}

const replaceOtherCosts = async (trx, orderId, costs) => {
  await trx('order_other_costs').where({ order_id: orderId }).delete();
  if (costs?.length) await trx('order_other_costs').insert(costs.map((cost) => ({ ...cost, order_id: orderId })));
};

async function create(input, actor) {
  const { items: rows, other_costs: otherCosts, ...headerInput } = input;
  const customer = await assertCustomer(input.customer_id);

  const id = await db.transaction(async (trx) => {
    const orderNo = await nextNumber(trx, 'order');
    const [orderId] = await trx('orders').insert({
      ...headerInput,
      order_no: orderNo,
      certificate_name: headerInput.certificate_name ?? customer.company_name,
      certificate_address: headerInput.certificate_address ?? customer.address,
      status: S.ORDER.REQUESTED,
      created_by: actor.id
    });
    const items = await buildItems(rows, customer.id, 1, trx);
    await trx('order_items').insert(items.map((item) => ({ ...item, order_id: orderId })));
    await replaceOtherCosts(trx, orderId, otherCosts);
    await audit(
      {
        userId: actor.id,
        action: 'create',
        entity: 'orders',
        entityId: orderId,
        after: { order_no: orderNo, customer: customer.company_name, items: items.length, other_costs: otherCosts?.length ?? 0 }
      },
      trx
    );
    return orderId;
  });
  return get(id, actor);
}

async function update(id, input, actor) {
  const order = await getOrderRow(id, actor);
  if (!S.HEADER_EDITABLE.includes(order.status)) throw AppError.badRequest('Order tidak dapat diubah pada status ini');
  const { other_costs: otherCosts, ...patch } = input;
  const before = { ...order };
  const after = { ...patch };
  if (otherCosts) {
    const current = await db('order_other_costs').where({ order_id: id }).select('description', 'qty', 'unit').orderBy('id');
    before.other_costs = current.map((cost) => ({ ...cost, qty: Number(cost.qty) }));
    after.other_costs = otherCosts;
  }

  await db.transaction(async (trx) => {
    if (Object.keys(patch).length) await trx('orders').where({ id }).update(patch);
    if (otherCosts) await replaceOtherCosts(trx, id, otherCosts);
    await audit({ userId: actor.id, action: 'update', entity: 'orders', entityId: id, before, after }, trx);
  });
  return get(id, actor);
}

async function remove(id, actor) {
  const order = await getOrderRow(id, actor);
  if (order.status !== S.ORDER.REQUESTED)
    throw AppError.badRequest('Hanya order berstatus Permintaan yang dapat dihapus; batalkan order lainnya');
  await db.transaction(async (trx) => {
    await trx('attachments')
      .where({ entity: 'order_items' })
      .whereIn('entity_id', trx('order_items').where({ order_id: id }).select('id'))
      .delete();
    await trx('attachments').where({ entity: 'orders', entity_id: id }).delete();
    await trx('orders').where({ id }).delete();
    await audit(
      {
        userId: actor.id,
        action: 'delete',
        entity: 'orders',
        entityId: id,
        before: { order_no: order.order_no, customer: order.company_name }
      },
      trx
    );
  });
}

async function addItems(id, rows, actor) {
  const order = await getOrderRow(id, actor);
  if (!S.ITEMS_EDITABLE.includes(order.status)) throw AppError.badRequest('Alat hanya dapat diubah sebelum Kaji Ulang');
  await db.transaction(async (trx) => {
    const [{ max }] = await trx('order_items').where({ order_id: id }).max({ max: 'item_no' });
    const items = await buildItems(rows, order.customer_id, (max ?? 0) + 1, trx);
    await trx('order_items').insert(items.map((item) => ({ ...item, order_id: id })));
    await audit(
      {
        userId: actor.id,
        action: 'add_items',
        entity: 'orders',
        entityId: id,
        after: { items: items.map((item) => item.instrument_name) }
      },
      trx
    );
  });
  return get(id, actor);
}

// ---- Kaji Ulang

/** Cancels an order and all its items (final — a new order is made). */
async function cancelOrder(trx, order, reason, actor) {
  await trx('orders')
    .where({ id: order.id })
    .update({ status: S.ORDER.CANCELLED, cancel_reason: reason ?? null });
  await trx('order_items').where({ order_id: order.id }).update({ status: S.ITEM.CANCELLED });
  await audit(
    {
      userId: actor.id,
      action: 'transition',
      entity: 'orders',
      entityId: order.id,
      before: { status: order.status },
      after: { status: S.ORDER.CANCELLED, reason }
    },
    trx
  );
}

async function contractReview(id, { decision, checklist, notes }, actor) {
  const order = await getOrderRow(id, actor);
  if (order.status !== S.ORDER.REQUESTED) throw AppError.badRequest('Kaji Ulang hanya untuk order berstatus Permintaan');
  const itemIds = (await db('order_items').where({ order_id: id }).select('id')).map((item) => item.id).sort((a, b) => a - b);
  const reviewed = [...new Set(checklist.map((row) => row.order_item_id))].sort((a, b) => a - b);
  if (JSON.stringify(itemIds) !== JSON.stringify(reviewed))
    throw AppError.badRequest('Checklist harus mencakup setiap alat pada order ini');

  await db.transaction(async (trx) => {
    await trx('contract_reviews').insert({
      order_id: id,
      reviewer_id: actor.id,
      decision,
      checklist: JSON.stringify(checklist),
      notes: notes ?? null
    });
    await audit(
      { userId: actor.id, action: 'contract_review', entity: 'orders', entityId: id, after: { decision, notes, checklist } },
      trx
    );
    if (decision === 'accepted') {
      await trx('orders').where({ id }).update({ status: S.ORDER.REVIEWED });
    } else {
      await cancelOrder(trx, order, `Kaji Ulang: pekerjaan ditolak${notes ? ` — ${notes}` : ''}`, actor);
    }
  });
  return get(id, actor);
}

// ---- transitions, PO

async function transition(id, { to, reason }, actor) {
  const order = await getOrderRow(id, actor);
  if (to === S.ORDER.CANCELLED) {
    if (!actor.permissions.has('orders:cancel')) throw AppError.forbidden();
    if (!S.CANCELLABLE.includes(order.status)) throw AppError.badRequest('Order tidak dapat dibatalkan pada status ini');
    if (!reason) throw AppError.badRequest('Alasan pembatalan wajib diisi', [{ field: 'reason', message: 'Wajib diisi' }]);
    await db.transaction(async (trx) => cancelOrder(trx, order, reason, actor));
    return get(id, actor);
  }
  const permission = S.MANUAL_TRANSITIONS[order.status]?.[to];
  if (!permission) throw AppError.badRequest(`Perubahan status ${order.status} → ${to} tidak diizinkan`);
  if (!actor.permissions.has(permission)) throw AppError.forbidden();
  await db('orders').where({ id }).update({ status: to });
  await audit({
    userId: actor.id,
    action: 'transition',
    entity: 'orders',
    entityId: id,
    before: { status: order.status },
    after: { status: to, reason }
  });
  return get(id, actor);
}

async function setPo(id, { po_no: poNo, po_date: poDate }, files, actor) {
  const order = await getOrderRow(id, actor);
  if (order.status !== S.ORDER.QUOTED) throw AppError.badRequest('PO hanya dapat dicatat setelah penawaran dikirim');
  await db.transaction(async (trx) => {
    await trx('orders').where({ id }).update({ po_no: poNo, po_date: poDate, status: S.ORDER.CONFIRMED });
    await saveAttachments(files, { entity: 'orders', entityId: id, kind: 'po', userId: actor.id }, trx);
    await audit(
      {
        userId: actor.id,
        action: 'po',
        entity: 'orders',
        entityId: id,
        before: { status: order.status },
        after: { status: S.ORDER.CONFIRMED, po_no: poNo, po_date: poDate, files: files?.length ?? 0 }
      },
      trx
    );
  });
  return get(id, actor);
}

// ---- on-site plan and Surat Tugas

async function assertHasOnsiteItems(id) {
  const [{ count }] = await db('order_items')
    .where({ order_id: id, location: 'on_site' })
    .whereNot('status', S.ITEM.CANCELLED)
    .count({ count: '*' });
  if (!Number(count)) throw AppError.badRequest('Order ini tidak memiliki alat on-site');
}

async function setOnsite(id, { visits, team }, actor) {
  const order = await getOrderRow(id, actor);
  if (S.FINAL.includes(order.status) || order.status === S.ORDER.COMPLETED)
    throw AppError.badRequest('Order sudah selesai atau dibatalkan');
  await assertHasOnsiteItems(id);
  const users = await db('users').whereIn('id', team).where({ is_active: true });
  if (users.length !== new Set(team).size) throw AppError.badRequest('Anggota tim tidak ditemukan atau tidak aktif');

  const before = {
    visits: await db('order_onsite_visits').where({ order_id: id }).select('location', 'visit_start', 'visit_end'),
    team: (await db('order_onsite_team').where({ order_id: id })).map((row) => row.user_id)
  };
  await db.transaction(async (trx) => {
    await trx('order_onsite_visits').where({ order_id: id }).delete();
    await trx('order_onsite_visits').insert(visits.map((visit) => ({ ...visit, order_id: id })));
    await trx('order_onsite_team').where({ order_id: id }).delete();
    await trx('order_onsite_team').insert([...new Set(team)].map((userId) => ({ order_id: id, user_id: userId })));
    await audit({ userId: actor.id, action: 'onsite_plan', entity: 'orders', entityId: id, before, after: { visits, team } }, trx);
  });
  return get(id, actor);
}

async function issueAssignmentLetter(id, actor) {
  const order = await getOrderRow(id, actor);
  if (!S.DP_PAID_OR_LATER.includes(order.status) || S.FINAL.includes(order.status)) {
    throw AppError.badRequest('Surat Tugas hanya dapat diterbitkan setelah DP dibayar');
  }
  await assertHasOnsiteItems(id);
  const [visits, team, existing] = await Promise.all([
    db('order_onsite_visits').where({ order_id: id }).first(),
    db('order_onsite_team').where({ order_id: id }).first(),
    db('assignment_letters').where({ order_id: id }).first()
  ]);
  if (existing) throw AppError.conflict('Surat Tugas untuk order ini sudah diterbitkan');
  if (!visits || !team) throw AppError.badRequest('Lengkapi lokasi, jadwal kunjungan dan tim terlebih dahulu');

  await db.transaction(async (trx) => {
    const letterNo = await nextNumber(trx, 'surat_tugas');
    const [letterId] = await trx('assignment_letters').insert({ letter_no: letterNo, order_id: id, issued_by: actor.id });
    await audit(
      {
        userId: actor.id,
        action: 'create',
        entity: 'assignment_letters',
        entityId: letterId,
        after: { letter_no: letterNo, order_no: order.order_no }
      },
      trx
    );
  });
  return get(id, actor);
}

/** Active users that can be assigned or put on an on-site team. */
async function assignableUsers() {
  const users = await db('users').where({ is_active: true }).select('id', 'username', 'full_name').orderBy('full_name');
  const roles = await db('user_roles as ur')
    .join('roles as r', 'r.id', 'ur.role_id')
    .where('r.is_customer_scope', false)
    .select('ur.user_id', 'r.name');
  return users
    .map((user) => ({ ...user, roles: roles.filter((role) => role.user_id === user.id).map((role) => role.name) }))
    .filter((user) => user.roles.length);
}

module.exports = {
  list,
  get,
  getOrderRow,
  create,
  update,
  remove,
  addItems,
  buildItems,
  contractReview,
  transition,
  cancelOrder,
  setPo,
  setOnsite,
  issueAssignmentLetter,
  assignableUsers,
  toItem
};
