const db = require('../../db');
const AppError = require('../../lib/AppError');
const audit = require('../../lib/audit');
const { saveAttachments } = require('../../lib/uploads');
const orders = require('./service');
const S = require('./status');

async function getItem(id, user, conn = db) {
  const item = await conn('order_items').where({ id }).first();
  if (!item) throw AppError.notFound('Alat tidak ditemukan');
  const order = await orders.getOrderRow(item.order_id, user, conn); // also enforces customer scope
  return { item, order };
}

const assertDpPaid = (order) => {
  if (!S.DP_PAID_OR_LATER.includes(order.status) || S.FINAL.includes(order.status)) {
    throw AppError.badRequest('Pekerjaan hanya dapat dimulai setelah DP dibayar');
  }
};

// The first receipt or check starts the work on the order.
const markInProgress = (trx, order) =>
  order.status === S.ORDER.DP_PAID ? trx('orders').where({ id: order.id }).update({ status: S.ORDER.IN_PROGRESS }) : null;

// ---- editing the request (before Kaji Ulang)

async function update(id, input, actor) {
  const { item, order } = await getItem(id, actor);
  if (!S.ITEMS_EDITABLE.includes(order.status)) throw AppError.badRequest('Alat hanya dapat diubah sebelum Kaji Ulang');
  const { extra_specs: extraSpecs, ...patch } = input;
  if (patch.method_id || extraSpecs !== undefined || patch.equipment_id || patch.location) {
    // Re-run the request rules (method exists, equipment belongs to the customer, method's extra fields).
    const [built] = await orders.buildItems(
      [{ ...item, extra_specs: extraSpecs ?? orders.toItem(item).extra_specs, ...patch, qty: 1 }],
      order.customer_id,
      item.item_no
    );
    patch.extra_specs = built.extra_specs;
    if (patch.location && patch.location !== item.location && patch.calibration_place === undefined)
      patch.calibration_place = built.calibration_place;
  }
  await db('order_items').where({ id }).update(patch);
  await audit({ userId: actor.id, action: 'update', entity: 'order_items', entityId: id, before: item, after: patch });
  return orders.get(order.id, actor);
}

async function remove(id, actor) {
  const { item, order } = await getItem(id, actor);
  if (!S.ITEMS_EDITABLE.includes(order.status)) throw AppError.badRequest('Alat hanya dapat diubah sebelum Kaji Ulang');
  const [{ count }] = await db('order_items').where({ order_id: order.id }).count({ count: '*' });
  if (Number(count) <= 1) throw AppError.badRequest('Order harus memiliki minimal satu alat; hapus order bila tidak diperlukan');
  await db.transaction(async (trx) => {
    await trx('attachments').where({ entity: 'order_items', entity_id: id }).delete();
    await trx('order_items').where({ id }).delete();
    // Keep item numbers 1..n (they become part of the certificate number).
    const rest = await trx('order_items').where({ order_id: order.id }).orderBy('item_no').select('id');
    for (const [index, row] of rest.entries())
      await trx('order_items')
        .where({ id: row.id })
        .update({ item_no: -(index + 1) });
    await trx('order_items')
      .where({ order_id: order.id })
      .update({ item_no: trx.raw('-item_no') });
    await audit({ userId: actor.id, action: 'delete', entity: 'order_items', entityId: id, before: item }, trx);
  });
  return orders.get(order.id, actor);
}

// ---- Serah Terima dan Pemeriksaan UUT

async function receive(id, { condition, accessories, notes }, actor) {
  const { item, order } = await getItem(id, actor);
  assertDpPaid(order);
  if (item.location !== 'in_lab') throw AppError.badRequest('Alat on-site tidak melalui penerimaan di lab');
  if (item.status !== S.ITEM.PENDING) throw AppError.badRequest('Alat sudah diterima');
  const patch = { status: S.ITEM.RECEIVED, received_condition: condition, accessories: accessories ?? null, received_at: db.fn.now() };
  if (notes) patch.check_notes = notes;
  await db.transaction(async (trx) => {
    await trx('order_items').where({ id }).update(patch);
    await markInProgress(trx, order);
    await audit(
      {
        userId: actor.id,
        action: 'receive',
        entity: 'order_items',
        entityId: id,
        before: { status: item.status },
        after: { status: patch.status, condition, accessories, notes }
      },
      trx
    );
  });
  return orders.get(order.id, actor);
}

async function addPhotos(id, files, actor) {
  const { item, order } = await getItem(id, actor);
  if (!files?.length) throw AppError.badRequest('Pilih minimal satu foto');
  if (![S.ITEM.RECEIVED, S.ITEM.CHECKED].includes(item.status)) throw AppError.badRequest('Foto diunggah saat penerimaan alat');
  await db.transaction(async (trx) => {
    const ids = await saveAttachments(files, { entity: 'order_items', entityId: id, kind: 'item_photo', userId: actor.id }, trx);
    await audit({ userId: actor.id, action: 'upload', entity: 'order_items', entityId: id, after: { item_photo: ids.length } }, trx);
  });
  return orders.get(order.id, actor);
}

async function check(id, input, files, actor) {
  const { item, order } = await getItem(id, actor);
  assertDpPaid(order);
  if (item.location === 'in_lab' && item.status !== S.ITEM.RECEIVED) throw AppError.badRequest('Terima alat terlebih dahulu');
  if (item.location === 'on_site') {
    if (item.status !== S.ITEM.PENDING) throw AppError.badRequest('Alat sudah diperiksa');
    const letter = await db('assignment_letters').where({ order_id: order.id }).first();
    if (!letter) throw AppError.badRequest('Terbitkan Surat Tugas terlebih dahulu');
  }
  const patch = { status: S.ITEM.CHECKED };
  if (input.check_notes !== undefined) patch.check_notes = input.check_notes;
  if (input.condition) patch.received_condition = input.condition;
  if (input.accessories !== undefined) patch.accessories = input.accessories;
  const after = { ...patch };

  await db.transaction(async (trx) => {
    await trx('order_items')
      .where({ id })
      .update({ ...patch, checked_at: trx.fn.now() });
    await saveAttachments(files, { entity: 'order_items', entityId: id, kind: 'client_signature', userId: actor.id }, trx);
    await markInProgress(trx, order);
    await audit(
      {
        userId: actor.id,
        action: 'check',
        entity: 'order_items',
        entityId: id,
        before: { status: item.status },
        after: { ...after, client_signature: files?.length ?? 0 }
      },
      trx
    );
  });
  return orders.get(order.id, actor);
}

async function customerAgreement(id, { agreed }, actor) {
  const { item, order } = await getItem(id, actor);
  if (item.status !== S.ITEM.CHECKED) throw AppError.badRequest('Persetujuan pelanggan dicatat setelah pemeriksaan alat');
  await db.transaction(async (trx) => {
    await trx('order_items')
      .where({ id })
      .update({ customer_agreed: agreed, customer_agreed_at: trx.fn.now(), status: agreed ? S.ITEM.AGREED : item.status });
    await audit({ userId: actor.id, action: 'customer_agreement', entity: 'order_items', entityId: id, after: { agreed } }, trx);
    // Customer disagrees → the whole order is cancelled (final; a new order is made).
    if (!agreed) await orders.cancelOrder(trx, order, `Pelanggan tidak setuju (alat no. ${item.item_no} — ${item.instrument_name})`, actor);
  });
  return orders.get(order.id, actor);
}

// ---- assignment (Manajer Teknis)

async function assign(id, { user_id: userId }, actor) {
  const { item, order } = await getItem(id, actor);
  if (![S.ITEM.AGREED, S.ITEM.ASSIGNED].includes(item.status)) throw AppError.badRequest('Alat dapat ditugaskan setelah pelanggan setuju');
  const user = await db('users').where({ id: userId, is_active: true }).first();
  if (!user) throw AppError.badRequest('Teknisi tidak ditemukan atau tidak aktif');
  if (item.location === 'on_site') {
    const member = await db('order_onsite_team').where({ order_id: order.id, user_id: userId }).first();
    if (!member) throw AppError.badRequest('Untuk alat on-site, pilih anggota tim Surat Tugas');
  }
  await db('order_items').where({ id }).update({ assigned_to: userId, status: S.ITEM.ASSIGNED });
  await audit({
    userId: actor.id,
    action: 'assign',
    entity: 'order_items',
    entityId: id,
    before: { status: item.status, assigned_to: item.assigned_to },
    after: { status: S.ITEM.ASSIGNED, assigned_to: userId }
  });
  return orders.get(order.id, actor);
}

module.exports = { getItem, update, remove, receive, addPhotos, check, customerAgreement, assign };
