// Indonesian labels for audit log entities and events. Unknown codes fall back to the raw code.
export const ENTITY_LABELS = {
  users: 'Pengguna',
  roles: 'Role',
  menus: 'Menu',
  customers: 'Pelanggan',
  standard_instruments: 'Standard Instrument',
  methods: 'Metode Kalibrasi'
};

export const EVENT_LABELS = {
  create: { label: 'Tambah', bg: 'success' },
  update: { label: 'Ubah', bg: 'warning' },
  delete: { label: 'Hapus', bg: 'danger' },
  login: { label: 'Login', bg: 'info' },
  change_password: { label: 'Ganti Password', bg: 'secondary' },
  update_permissions: { label: 'Ubah Hak Akses', bg: 'primary' }
};

export const entityLabel = (code) => ENTITY_LABELS[code] ?? code;
export const eventLabel = (code) => EVENT_LABELS[code]?.label ?? code;
export const eventBg = (code) => EVENT_LABELS[code]?.bg ?? 'secondary';

export const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'medium' }) : '-';
