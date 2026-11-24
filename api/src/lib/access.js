const db = require('../db');

/** Roles of one or more users: Map(userId → [{ id, name, is_system, is_customer_scope }]). */
async function rolesByUser(userIds, conn = db) {
  const map = new Map(userIds.map((id) => [id, []]));
  if (!userIds.length) return map;
  const rows = await conn('user_roles as ur')
    .join('roles as r', 'r.id', 'ur.role_id')
    .whereIn('ur.user_id', userIds)
    .select('ur.user_id', 'r.id', 'r.name', 'r.is_system', 'r.is_customer_scope')
    .orderBy('r.id');
  for (const { user_id, ...role } of rows) {
    map.get(user_id).push({ ...role, is_system: Boolean(role.is_system), is_customer_scope: Boolean(role.is_customer_scope) });
  }
  return map;
}

/** Union of all permissions of the user's roles, as a Set of "menu:action". */
async function permissionsOf(userId, conn = db) {
  const rows = await conn('user_roles as ur')
    .join('role_permissions as rp', 'rp.role_id', 'ur.role_id')
    .join('menus as m', 'm.id', 'rp.menu_id')
    .where('ur.user_id', userId)
    .distinct('m.code', 'rp.action');
  return new Set(rows.map((row) => `${row.code}:${row.action}`));
}

/** Visible menu tree for a permission set: pages the user can view, inside visible groups. */
async function menuTreeFor(permissions, conn = db) {
  const menus = await conn('menus').where({ is_visible: true }).orderBy(['sort_order', 'id']);
  const groups = menus.filter((menu) => !menu.parent_id);
  return groups
    .map((group) => ({
      code: group.code,
      label: group.label,
      children: menus
        .filter((menu) => menu.parent_id === group.id && permissions.has(`${menu.code}:view`))
        .map((menu) => ({ code: menu.code, label: menu.label, path: menu.path }))
    }))
    .filter((group) => group.children.length);
}

module.exports = { rolesByUser, permissionsOf, menuTreeFor };
