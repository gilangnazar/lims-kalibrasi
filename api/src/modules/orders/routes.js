const express = require('express');
const authenticate = require('../../middleware/authenticate');
const requirePermission = require('../../middleware/requirePermission');
const { requireAnyPermission } = require('../../middleware/requirePermission');
const validate = require('../../middleware/validate');
const respond = require('../../lib/respond');
const { idParams } = require('../../lib/params');
const { upload, discardFiles } = require('../../lib/uploads');
const schema = require('./schema');
const service = require('./service');
const items = require('./items');

// Pages that open an order: Order, Kaji Ulang, Penerimaan & Pemeriksaan, Penugasan & Surat Tugas.
const canSeeOrders = requireAnyPermission('orders:view', 'contract-reviews:view', 'intake:view', 'assignments:view');

// Uploaded files are removed again when the request fails after the upload.
const withUploads = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (err) {
    discardFiles(req.files);
    throw err;
  }
};

// ---- /api/orders
const orders = express.Router();
orders.use(authenticate);

orders.get('/', canSeeOrders, validate({ query: schema.listOrders }), async (req, res) => {
  respond.list(res, await service.list(req.valid.query, req.user));
});

// Active staff for assignment and on-site teams.
orders.get('/assignable-users', requirePermission('assignments', 'edit'), async (_req, res) => {
  respond.ok(res, await service.assignableUsers());
});

orders.get('/:id', canSeeOrders, validate({ params: idParams }), async (req, res) => {
  respond.ok(res, await service.get(req.valid.params.id, req.user));
});

orders.post('/', requirePermission('orders', 'add'), validate({ body: schema.createOrder }), async (req, res) => {
  respond.created(res, await service.create(req.valid.body, req.user), 'Permintaan kalibrasi berhasil dibuat');
});

orders.put('/:id', requirePermission('orders', 'edit'), validate({ params: idParams, body: schema.updateOrder }), async (req, res) => {
  respond.ok(res, await service.update(req.valid.params.id, req.valid.body, req.user), 'Order berhasil diperbarui');
});

orders.delete('/:id', requirePermission('orders', 'delete'), validate({ params: idParams }), async (req, res) => {
  await service.remove(req.valid.params.id, req.user);
  respond.ok(res, undefined, 'Order berhasil dihapus');
});

orders.post('/:id/items', requirePermission('orders', 'edit'), validate({ params: idParams, body: schema.addItems }), async (req, res) => {
  respond.created(res, await service.addItems(req.valid.params.id, req.valid.body.items, req.user), 'Alat berhasil ditambahkan');
});

orders.post(
  '/:id/contract-review',
  requirePermission('contract-reviews', 'approve'),
  validate({ params: idParams, body: schema.contractReview }),
  async (req, res) => {
    respond.ok(res, await service.contractReview(req.valid.params.id, req.valid.body, req.user), 'Kaji Ulang berhasil disimpan');
  }
);

// Manual steps (quoted, declined, DP paid until steps 07–08) and cancel; the service checks which.
orders.post(
  '/:id/transition',
  requireAnyPermission('orders:edit', 'orders:cancel'),
  validate({ params: idParams, body: schema.transition }),
  async (req, res) => {
    respond.ok(res, await service.transition(req.valid.params.id, req.valid.body, req.user), 'Status order berhasil diubah');
  }
);

// multipart: po_no, po_date, file (optional PDF/image of the PO).
orders.post(
  '/:id/po',
  requirePermission('orders', 'edit'),
  upload({ field: 'file', types: 'document', maxCount: 1 }),
  validate({ params: idParams, body: schema.po }),
  withUploads(async (req, res) => {
    respond.ok(res, await service.setPo(req.valid.params.id, req.valid.body, req.files, req.user), 'PO berhasil dicatat');
  })
);

orders.put(
  '/:id/onsite',
  requirePermission('assignments', 'edit'),
  validate({ params: idParams, body: schema.onsite }),
  async (req, res) => {
    respond.ok(res, await service.setOnsite(req.valid.params.id, req.valid.body, req.user), 'Rencana on-site berhasil disimpan');
  }
);

orders.post('/:id/assignment-letter', requirePermission('assignments', 'edit'), validate({ params: idParams }), async (req, res) => {
  respond.ok(res, await service.issueAssignmentLetter(req.valid.params.id, req.user), 'Surat Tugas berhasil diterbitkan');
});

// ---- /api/order-items
const orderItems = express.Router();
orderItems.use(authenticate);

orderItems.put('/:id', requirePermission('orders', 'edit'), validate({ params: idParams, body: schema.itemUpdate }), async (req, res) => {
  respond.ok(res, await items.update(req.valid.params.id, req.valid.body, req.user), 'Alat berhasil diperbarui');
});

orderItems.delete('/:id', requirePermission('orders', 'edit'), validate({ params: idParams }), async (req, res) => {
  respond.ok(res, await items.remove(req.valid.params.id, req.user), 'Alat berhasil dihapus');
});

orderItems.post(
  '/:id/receive',
  requirePermission('intake', 'edit'),
  validate({ params: idParams, body: schema.receive }),
  async (req, res) => {
    respond.ok(res, await items.receive(req.valid.params.id, req.valid.body, req.user), 'Alat berhasil diterima');
  }
);

// multipart: photos (several images, Admin at in-lab receipt).
orderItems.post(
  '/:id/photos',
  requirePermission('intake', 'edit'),
  upload({ field: 'photos', types: 'image', maxCount: 10, maxSizeMb: 8 }),
  validate({ params: idParams }),
  withUploads(async (req, res) => {
    respond.created(res, await items.addPhotos(req.valid.params.id, req.files, req.user), 'Foto berhasil diunggah');
  })
);

// multipart: check_notes, condition, accessories, file (optional signed form scan).
orderItems.post(
  '/:id/check',
  requirePermission('intake', 'edit'),
  upload({ field: 'file', types: 'document', maxCount: 1 }),
  validate({ params: idParams, body: schema.check }),
  withUploads(async (req, res) => {
    respond.ok(res, await items.check(req.valid.params.id, req.valid.body, req.files, req.user), 'Pemeriksaan berhasil disimpan');
  })
);

orderItems.post(
  '/:id/customer-agreement',
  requirePermission('intake', 'edit'),
  validate({ params: idParams, body: schema.agreement }),
  async (req, res) => {
    respond.ok(res, await items.customerAgreement(req.valid.params.id, req.valid.body, req.user), 'Persetujuan pelanggan dicatat');
  }
);

orderItems.post(
  '/:id/assign',
  requirePermission('assignments', 'edit'),
  validate({ params: idParams, body: schema.assign }),
  async (req, res) => {
    respond.ok(res, await items.assign(req.valid.params.id, req.valid.body, req.user), 'Alat berhasil ditugaskan');
  }
);

module.exports = { orders, orderItems, canSeeOrders };
