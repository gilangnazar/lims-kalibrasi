const express = require('express');
const fs = require('fs');
const db = require('../../db');
const AppError = require('../../lib/AppError');
const audit = require('../../lib/audit');
const authenticate = require('../../middleware/authenticate');
const requirePermission = require('../../middleware/requirePermission');
const validate = require('../../middleware/validate');
const respond = require('../../lib/respond');
const { idParams } = require('../../lib/params');
const { absolutePath } = require('../../lib/uploads');
const { canSeeOrders } = require('../orders/routes');
const orders = require('../orders/service');
const S = require('../orders/status');

// Attachments belong to an order or an order item (P1). Access follows the order (incl. customer scope).
async function load(id, user) {
  const attachment = await db('attachments').where({ id }).first();
  if (!attachment) throw AppError.notFound('File tidak ditemukan');
  let orderId = attachment.entity_id;
  let item = null;
  if (attachment.entity === 'order_items') {
    item = await db('order_items').where({ id: attachment.entity_id }).first();
    orderId = item?.order_id;
  } else if (attachment.entity !== 'orders') {
    throw AppError.notFound('File tidak ditemukan');
  }
  await orders.getOrderRow(orderId, user); // 404 outside the user's scope
  return { attachment, item };
}

const router = express.Router();
router.use(authenticate);

router.get('/:id/file', canSeeOrders, validate({ params: idParams }), async (req, res) => {
  const { attachment } = await load(req.valid.params.id, req.user);
  const file = absolutePath(attachment);
  if (!fs.existsSync(file)) throw AppError.notFound('File tidak ditemukan di server');
  res.setHeader('Content-Type', attachment.mime);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.original_name)}"`);
  res.sendFile(file);
});

// Only item photos can be removed, and only until the customer agrees.
router.delete('/:id', requirePermission('intake', 'edit'), validate({ params: idParams }), async (req, res) => {
  const { attachment, item } = await load(req.valid.params.id, req.user);
  if (attachment.kind !== 'item_photo') throw AppError.badRequest('Hanya foto alat yang dapat dihapus');
  if (![S.ITEM.RECEIVED, S.ITEM.CHECKED].includes(item?.status)) throw AppError.badRequest('Foto tidak dapat dihapus pada status ini');
  await db('attachments').where({ id: attachment.id }).delete();
  fs.rm(absolutePath(attachment), { force: true }, () => {});
  await audit({
    userId: req.user.id,
    action: 'delete',
    entity: 'attachments',
    entityId: attachment.id,
    before: { kind: attachment.kind, original_name: attachment.original_name }
  });
  respond.ok(res, undefined, 'Foto berhasil dihapus');
});

module.exports = router;
