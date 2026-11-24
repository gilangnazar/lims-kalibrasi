const { z } = require('zod');
const { listQuery } = require('../../lib/pagination');
const { ORDER } = require('./status');

const text = (max) => z.string().trim().max(max).nullable().optional();
const id = z.number().int().positive();
// Multipart forms send everything as strings.
const formBool = z.union([z.boolean(), z.enum(['true', 'false']).transform((value) => value === 'true')]);

// One request row; qty N becomes N items at entry (one item = one unit = one certificate).
const itemRow = z.object({
  equipment_id: id.nullable().optional(),
  method_id: id,
  qty: z.number().int().min(1).max(100).default(1),
  instrument_name: z.string().trim().min(1).max(150),
  brand: text(100),
  model: text(100),
  serial_number: text(100),
  identity_no: text(100),
  range: text(100),
  resolution: text(100),
  extra_specs: z.record(z.string(), z.string().trim().max(255)).nullable().optional(),
  calibration_point: text(255),
  usage_range: text(255),
  location: z.enum(['in_lab', 'on_site'])
});

// Editing one existing item: no qty, every field optional.
const itemUpdate = itemRow
  .omit({ qty: true })
  .extend({ calibration_place: text(255) })
  .partial();

const otherCost = z.object({
  description: z.string().trim().min(1).max(255),
  qty: z.number().positive().max(100000).default(1),
  unit: text(30)
});

const header = {
  contact_name: text(100),
  contact_phone: text(30),
  contact_email: z.email('Email tidak valid').max(150).nullable().optional(),
  certificate_name: z.string().trim().min(1).max(150).optional(), // default: the customer's company name
  certificate_address: z.string().trim().min(1).max(2000).optional(), // default: the customer's address
  calibrated_before: z.boolean().optional(),
  apply_ppn: z.boolean().optional(),
  apply_pph23: z.boolean().optional(),
  request_notes: text(2000),
  due_at: z.iso.date().nullable().optional(),
  notes: text(2000)
};

const createOrder = z.object({
  customer_id: id,
  ...header,
  items: z.array(itemRow).min(1, 'Minimal satu alat').max(100),
  other_costs: z.array(otherCost).max(50).optional()
});

const updateOrder = z.object({ ...header, other_costs: z.array(otherCost).max(50).optional() });

const addItems = z.object({ items: z.array(itemRow).min(1).max(100) });

const listOrders = listQuery.extend({
  status: z.enum(Object.values(ORDER)).optional(),
  location: z.enum(['in_lab', 'on_site']).optional(),
  customer_id: z.coerce.number().int().positive().optional()
});

// Kaji Ulang (LKAL-FRM 7.1-01): V/X per item, conclusion and note.
const contractReview = z.object({
  decision: z.enum(['accepted', 'not_accepted']),
  checklist: z.array(z.object({ order_item_id: id, scope_ok: z.boolean(), method_ok: z.boolean(), standards_ok: z.boolean() })).min(1),
  notes: text(2000)
});

const transition = z.object({ to: z.enum(Object.values(ORDER)), reason: text(1000) });

const po = z.object({ po_no: z.string().trim().min(1).max(100), po_date: z.iso.date('Tanggal PO tidak valid') });

const onsite = z.object({
  visits: z
    .array(
      z
        .object({ location: z.string().trim().min(1).max(255), visit_start: z.iso.date(), visit_end: z.iso.date() })
        .refine((visit) => visit.visit_end >= visit.visit_start, { message: 'Tanggal selesai sebelum tanggal mulai', path: ['visit_end'] })
    )
    .min(1, 'Minimal satu kunjungan')
    .max(20),
  team: z.array(id).min(1, 'Minimal satu anggota tim').max(20)
});

// Serah Terima dan Pemeriksaan UUT.
const receive = z.object({
  condition: z.enum(['baik', 'tidak_baik']),
  accessories: text(2000),
  notes: text(2000)
});
const check = z.object({
  check_notes: text(2000),
  condition: z.enum(['baik', 'tidak_baik']).optional(), // on-site: recorded at the check
  accessories: text(2000)
});
const agreement = z.object({ agreed: formBool });
const assign = z.object({ user_id: id });

module.exports = {
  createOrder,
  updateOrder,
  addItems,
  itemUpdate,
  listOrders,
  contractReview,
  transition,
  po,
  onsite,
  receive,
  check,
  agreement,
  assign
};
