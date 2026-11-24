// Menu registry: the single source of menus and their allowed actions. syncMenus() copies it into
// the `menus` table; requirePermission(menu, action) is checked against it at boot.
// Codes are permanent identifiers — never rename one (permissions are stored by menu).

const ACTIONS = Object.freeze(['view', 'add', 'edit', 'delete', 'print', 'approve', 'cancel', 'report']);

const CRUD = ['view', 'add', 'edit', 'delete'];

// Top-level entries are groups (no path, no actions); children are the pages.
const MENU_TREE = Object.freeze([
  {
    code: 'order-intake',
    label: 'Order & Penerimaan',
    children: [
      // Request, items, other costs, PO, cancel; temporary manual "quoted" / "DP paid" until steps 07–08.
      { code: 'orders', label: 'Order', path: '/orders', actions: ['view', 'add', 'edit', 'delete', 'cancel', 'print'] },
      // Manajer Teknis: Kaji Ulang decision (accept / reject) per order.
      { code: 'contract-reviews', label: 'Kaji Ulang', path: '/contract-reviews', actions: ['view', 'approve'] },
      // Receive in-lab items, photos, UUT check (in-lab and on-site), client signature, customer agreement.
      { code: 'intake', label: 'Penerimaan & Pemeriksaan', path: '/intake', actions: ['view', 'edit'] },
      // Assign items to a Teknisi, on-site team and visits, Surat Tugas.
      { code: 'assignments', label: 'Penugasan & Surat Tugas', path: '/assignments', actions: ['view', 'edit', 'print'] }
    ]
  },
  {
    code: 'master-data',
    label: 'Master Data',
    children: [
      { code: 'customers', label: 'Pelanggan', path: '/customers', actions: CRUD },
      { code: 'equipment', label: 'Alat Pelanggan', path: '/equipment', actions: CRUD },
      { code: 'standard-instruments', label: 'Standard Instrument', path: '/standard-instruments', actions: CRUD },
      { code: 'methods', label: 'Metode Kalibrasi', path: '/methods', actions: CRUD }
    ]
  },
  {
    code: 'administration',
    label: 'Administrasi',
    children: [
      { code: 'users', label: 'Pengguna', path: '/users', actions: CRUD },
      { code: 'roles', label: 'Role & Hak Akses', path: '/roles', actions: CRUD },
      { code: 'menus', label: 'Manajemen Menu', path: '/menus', actions: ['view', 'edit'] },
      { code: 'audit-trail', label: 'Audit Trail', path: '/audit-trail', actions: ['view'] }
    ]
  }
]);

// Flat list in tree order: groups first, each followed by its children.
const MENUS = Object.freeze(
  MENU_TREE.flatMap((group, groupIndex) => [
    { code: group.code, parent: null, label: group.label, path: null, actions: [], sortOrder: (groupIndex + 1) * 10 },
    ...group.children.map((item, itemIndex) => ({
      code: item.code,
      parent: group.code,
      label: item.label,
      path: item.path,
      actions: item.actions,
      sortOrder: (itemIndex + 1) * 10
    }))
  ])
);

const MENU_BY_CODE = new Map(MENUS.map((menu) => [menu.code, menu]));

// Menus that can never be hidden, so an Admin can always get back to menu management.
const ALWAYS_VISIBLE = Object.freeze(['administration', 'menus']);

const ADMIN_ROLE = 'Admin';

module.exports = { ACTIONS, MENUS, MENU_BY_CODE, ALWAYS_VISIBLE, ADMIN_ROLE };
