import useSWR, { useSWRConfig } from 'swr';

import { api } from 'lib/api';

// Status labels and badge colours (API codes → Indonesian).
export const ORDER_STATUS = {
  requested: { label: 'Permintaan', bg: 'secondary' },
  reviewed: { label: 'Kaji Ulang Diterima', bg: 'info' },
  quoted: { label: 'Penawaran Dikirim', bg: 'info' },
  confirmed: { label: 'PO Diterima', bg: 'primary' },
  dp_paid: { label: 'DP Lunas', bg: 'primary' },
  in_progress: { label: 'Dikerjakan', bg: 'warning' },
  completed: { label: 'Selesai', bg: 'success' },
  closed: { label: 'Ditutup', bg: 'dark' },
  cancelled: { label: 'Dibatalkan', bg: 'danger' }
};

export const ITEM_STATUS = {
  pending: { label: 'Menunggu', bg: 'secondary' },
  received: { label: 'Diterima', bg: 'info' },
  checked: { label: 'Diperiksa', bg: 'info' },
  agreed: { label: 'Disetujui Pelanggan', bg: 'primary' },
  assigned: { label: 'Ditugaskan', bg: 'primary' },
  calibrating: { label: 'Dikalibrasi', bg: 'warning' },
  in_review: { label: 'Review', bg: 'warning' },
  rejected: { label: 'Ditolak MT', bg: 'danger' },
  approved: { label: 'Disetujui MT', bg: 'success' },
  certified: { label: 'Bersertifikat', bg: 'success' },
  returned: { label: 'Dikembalikan', bg: 'dark' },
  cancelled: { label: 'Dibatalkan', bg: 'danger' }
};

export const LOCATION = { in_lab: 'Di Lab', on_site: 'On-site' };
export const CONDITION = { baik: 'Baik', tidak_baik: 'Tidak Baik' };

export const DP_PAID_OR_LATER = ['dp_paid', 'in_progress', 'completed', 'closed'];

export const formatDate = (value) => (value ? new Date(value).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-');

const fetchData = (path) => api.get(path).then((res) => res.data);

/** One order with items, review, on-site plan and attachments; `run(fn)` calls the API and refreshes. */
export function useOrder(id) {
  const { mutate: mutateAll } = useSWRConfig();
  const { data, error, isLoading, mutate } = useSWR(id ? `/orders/${id}` : null, fetchData);

  const run = async (request) => {
    const res = await request();
    await mutate(res.data, { revalidate: false });
    await mutateAll((key) => Array.isArray(key) && key[0] === 'orders'); // lists
    return res.data;
  };

  return { order: data, error, isLoading, mutate, run };
}

/** Active staff for assignment and on-site teams. */
export function useAssignableUsers(enabled = true) {
  const { data } = useSWR(enabled ? '/orders/assignable-users' : null, fetchData);
  return data ?? [];
}
