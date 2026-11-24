const { MENUS, ADMIN_ROLE } = require('../config/menus');

/**
 * Copies the menu registry into the `menus` table and gives the Admin role every allowed action.
 * Upserts by code: parent, path and actions follow the registry; label, sort_order and is_visible are
 * set only on insert, so Admin edits (rename / reorder / hide) are never overwritten.
 * Runs from the seed, the test setup and on API start. Safe to run repeatedly.
 */
async function syncMenus(knex) {
  await knex.transaction(async (trx) => {
    const ids = new Map();
    for (const menu of MENUS) {
      const parentId = menu.parent ? ids.get(menu.parent) : null;
      const synced = { parent_id: parentId, path: menu.path, actions: JSON.stringify(menu.actions) };
      const existing = await trx('menus').where({ code: menu.code }).first();
      if (existing) {
        await trx('menus').where({ id: existing.id }).update(synced);
        ids.set(menu.code, existing.id);
      } else {
        const [id] = await trx('menus').insert({ code: menu.code, label: menu.label, sort_order: menu.sortOrder, ...synced });
        ids.set(menu.code, id);
      }
    }

    // Drop grants for actions a menu no longer allows.
    for (const menu of MENUS) {
      const q = trx('role_permissions').where({ menu_id: ids.get(menu.code) });
      if (menu.actions.length) q.whereNotIn('action', menu.actions);
      await q.delete();
    }

    // Admin always holds every allowed action (its grid is locked in the API).
    const admin = await trx('roles').where({ name: ADMIN_ROLE }).first();
    if (!admin) return;
    const rows = MENUS.flatMap((menu) => menu.actions.map((action) => ({ role_id: admin.id, menu_id: ids.get(menu.code), action })));
    if (rows.length) await trx('role_permissions').insert(rows).onConflict().ignore();
  });
}

module.exports = syncMenus;
