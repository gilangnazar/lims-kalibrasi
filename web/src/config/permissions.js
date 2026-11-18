// Mirrors the API's role checks (api/src/modules/*). The API is the real gate;
// this map only decides what the UI shows. Keep both in sync — see docs/PRD.md role matrix.
export const ROLES = Object.freeze({
  ADMIN: 'Admin',
  FINANCE: 'Finance',
  ADMIN_TEKNISI: 'Admin Teknisi',
  MANAJER_TEKNIS: 'Manajer Teknis',
  TEKNISI: 'Teknisi',
  CUSTOMER: 'Customer'
});

export const ALL_ROLES = Object.values(ROLES);

const { ADMIN, FINANCE, ADMIN_TEKNISI, MANAJER_TEKNIS, TEKNISI } = ROLES;
const LAB_STAFF = [ADMIN, ADMIN_TEKNISI, TEKNISI, MANAJER_TEKNIS];

export const PERMISSIONS = Object.freeze({
  'users.read': [ADMIN],
  'users.write': [ADMIN],
  'customers.read': [...LAB_STAFF, FINANCE],
  'customers.write': [ADMIN],
  'standard-instruments.read': LAB_STAFF,
  'standard-instruments.write': [ADMIN],
  'methods.read': LAB_STAFF,
  'methods.write': [ADMIN]
});

/** can(user, 'customers.write') → boolean. Unknown permissions are denied. */
export function can(user, permission) {
  return Boolean(user && PERMISSIONS[permission]?.includes(user.role));
}
