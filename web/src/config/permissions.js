// The API is the real gate; this only decides what the UI shows. Permissions come from the API
// (/auth/login and /auth/me) as "menu:action" strings — see api/src/config/menus.js for the codes.

export const ACTIONS = Object.freeze(['view', 'add', 'edit', 'delete', 'print', 'approve', 'cancel', 'report']);

export const ACTION_LABELS = Object.freeze({
  view: 'Lihat',
  add: 'Tambah',
  edit: 'Ubah',
  delete: 'Hapus',
  print: 'Cetak',
  approve: 'Setujui',
  cancel: 'Batalkan',
  report: 'Laporan'
});

/** can(user, 'customers', 'add') → boolean. Unknown menus/actions are denied. */
export function can(user, menu, action = 'view') {
  return Boolean(user?.permissions?.includes(`${menu}:${action}`));
}
