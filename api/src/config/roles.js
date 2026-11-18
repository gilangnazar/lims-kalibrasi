// Role values are stored in the DB and sent to the web app — keep the exact Indonesian spelling.
const ROLES = Object.freeze({
  ADMIN: 'Admin',
  FINANCE: 'Finance',
  ADMIN_TEKNISI: 'Admin Teknisi',
  MANAJER_TEKNIS: 'Manajer Teknis',
  TEKNISI: 'Teknisi',
  CUSTOMER: 'Customer'
});

const ALL_ROLES = Object.values(ROLES);
const STAFF_ROLES = ALL_ROLES.filter((role) => role !== ROLES.CUSTOMER);

module.exports = { ROLES, ALL_ROLES, STAFF_ROLES };
