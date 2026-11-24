// Order and item states (PRD §14). One flow for every method.
//
// Order: requested → reviewed → quoted → confirmed → dp_paid → in_progress → completed → closed
//        cancelled from Kaji Ulang "ditolak", an Admin cancel, or a customer who disagrees (final).
//        A declined quotation sends quoted → reviewed.
// Item:  pending → received (in-lab only) → checked → agreed → assigned → calibrating → in_review
//        → approved → certified → returned; rejected → calibrating; cancelled with its order.

const ORDER = Object.freeze({
  REQUESTED: 'requested',
  REVIEWED: 'reviewed',
  QUOTED: 'quoted',
  CONFIRMED: 'confirmed',
  DP_PAID: 'dp_paid',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CLOSED: 'closed',
  CANCELLED: 'cancelled'
});

const ITEM = Object.freeze({
  PENDING: 'pending',
  RECEIVED: 'received',
  CHECKED: 'checked',
  AGREED: 'agreed',
  ASSIGNED: 'assigned',
  CALIBRATING: 'calibrating',
  IN_REVIEW: 'in_review',
  REJECTED: 'rejected',
  APPROVED: 'approved',
  CERTIFIED: 'certified',
  RETURNED: 'returned',
  CANCELLED: 'cancelled'
});

// Items (and the request header's item list) can change only before Kaji Ulang.
const ITEMS_EDITABLE = [ORDER.REQUESTED];
// Request header and other costs can change until the PO confirms the order.
const HEADER_EDITABLE = [ORDER.REQUESTED, ORDER.REVIEWED, ORDER.QUOTED];
// The DP gate: receiving items and issuing the Surat Tugas need the DP paid.
const DP_PAID_OR_LATER = [ORDER.DP_PAID, ORDER.IN_PROGRESS, ORDER.COMPLETED, ORDER.CLOSED];
const FINAL = [ORDER.CLOSED, ORDER.CANCELLED];
const CANCELLABLE = [ORDER.REQUESTED, ORDER.REVIEWED, ORDER.QUOTED, ORDER.CONFIRMED, ORDER.DP_PAID, ORDER.IN_PROGRESS];

// Manual order transitions (POST /orders/:id/transition) and the permission each needs.
// "quoted" and "dp_paid" are set by quotations (step 07) and invoices (step 08) later; until then
// these guarded manual steps stand in for them.
const MANUAL_TRANSITIONS = {
  [ORDER.REVIEWED]: { [ORDER.QUOTED]: 'orders:edit' },
  [ORDER.QUOTED]: { [ORDER.REVIEWED]: 'orders:edit' }, // quotation declined (Ditolak)
  [ORDER.CONFIRMED]: { [ORDER.DP_PAID]: 'orders:edit' }
};

const ORDER_LABELS = {
  requested: 'Permintaan',
  reviewed: 'Kaji Ulang Diterima',
  quoted: 'Penawaran Dikirim',
  confirmed: 'PO Diterima',
  dp_paid: 'DP Lunas',
  in_progress: 'Dikerjakan',
  completed: 'Selesai',
  closed: 'Ditutup',
  cancelled: 'Dibatalkan'
};

module.exports = {
  ORDER,
  ITEM,
  ITEMS_EDITABLE,
  HEADER_EDITABLE,
  DP_PAID_OR_LATER,
  FINAL,
  CANCELLABLE,
  MANUAL_TRANSITIONS,
  ORDER_LABELS
};
