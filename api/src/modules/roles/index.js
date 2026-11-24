const { z } = require('zod');
const db = require('../../db');
const AppError = require('../../lib/AppError');
const audit = require('../../lib/audit');
const crudRouter = require('../../lib/crudRouter');
const requirePermission = require('../../middleware/requirePermission');
const validate = require('../../middleware/validate');
const respond = require('../../lib/respond');
const { idParams } = require('../../lib/params');
const { listQuery, applySearch, applySort, paginate } = require('../../lib/pagination');
const { ACTIONS, MENUS, MENU_BY_CODE, ADMIN_ROLE } = require('../../config/menus');

// ---- schema
const fields = z.object({
  name: z.string().trim().min(1).max(50),
  description: z.string().trim().max(255).nullable().optional(),
  is_customer_scope: z.boolean().default(false)
});
const updateFields = z
  .object({
    name: z.string().trim().min(1).max(50),
    description: z.string().trim().max(255).nullable(),
    is_customer_scope: z.boolean()
  })
  .partial();
// { "customers": ["view", "add"], "methods": ["view"] } — menus left out get no permissions.
const permissionsBody = z.object({ permissions: z.record(z.string(), z.array(z.enum(ACTIONS)).max(ACTIONS.length)) });

// ---- service
const toPublic = (role) => role && { ...role, is_system: Boolean(role.is_system), is_customer_scope: Boolean(role.is_customer_scope) };
const userCount = () => db('user_roles').whereRaw('user_roles.role_id = roles.id').count('*').as('user_count');

const service = {
  async list({ page, limit, search, sort }) {
    const qb = db('roles').select('roles.*', userCount());
    applySearch(qb, search, ['name', 'description']);
    applySort(qb, sort, ['name', 'created_at'], 'id');
    const result = await paginate(qb, { page, limit });
    return { ...result, data: result.data.map((role) => ({ ...toPublic(role), user_count: Number(role.user_count) })) };
  },

  async get(id) {
    const role = await db('roles').select('roles.*', userCount()).where({ id }).first();
    if (!role) throw AppError.notFound('Role tidak ditemukan');
    return { ...toPublic(role), user_count: Number(role.user_count) };
  },

  async create(input, actor) {
    const [id] = await db('roles').insert({ ...input, is_system: false });
    await audit({ userId: actor.id, action: 'create', entity: 'roles', entityId: id, after: input });
    return service.get(id);
  },

  async update(id, input, actor) {
    const role = await service.get(id);
    if (role.is_system && input.name !== undefined && input.name !== role.name) {
      throw AppError.badRequest('Nama role sistem tidak dapat diubah');
    }
    if (role.is_system && input.is_customer_scope !== undefined && input.is_customer_scope !== role.is_customer_scope) {
      throw AppError.badRequest('Jenis role sistem tidak dapat diubah');
    }
    if (input.is_customer_scope !== undefined && input.is_customer_scope !== role.is_customer_scope && role.user_count > 0) {
      throw AppError.badRequest('Jenis role tidak dapat diubah selama masih dipakai user');
    }
    if (Object.keys(input).length) {
      await db('roles').where({ id }).update(input);
      await audit({ userId: actor.id, action: 'update', entity: 'roles', entityId: id, before: role, after: input });
    }
    return service.get(id);
  },

  async remove(id, actor) {
    const role = await service.get(id);
    if (role.is_system) throw AppError.badRequest('Role sistem tidak dapat dihapus');
    if (role.user_count > 0) throw AppError.badRequest('Role masih dipakai oleh user');
    await db('roles').where({ id }).delete(); // role_permissions cascade
    await audit({ userId: actor.id, action: 'delete', entity: 'roles', entityId: id, before: role });
  },

  /** The grid: every registry page with its allowed and granted actions, in menu order. */
  async getPermissions(id) {
    const role = await service.get(id);
    const menus = await db('menus').whereIn(
      'code',
      MENUS.map((menu) => menu.code)
    );
    const byCode = new Map(menus.map((menu) => [menu.code, menu]));
    const granted = await db('role_permissions as rp')
      .join('menus as m', 'm.id', 'rp.menu_id')
      .where('rp.role_id', id)
      .select('m.code', 'rp.action');

    return {
      role,
      locked: role.name === ADMIN_ROLE,
      groups: MENUS.filter((menu) => !menu.parent).map((menu) => ({
        code: menu.code,
        label: byCode.get(menu.code)?.label ?? menu.label
      })),
      menus: MENUS.filter((menu) => menu.actions.length).map((menu) => ({
        code: menu.code,
        group: menu.parent,
        label: byCode.get(menu.code)?.label ?? menu.label,
        actions: menu.actions,
        granted: menu.actions.filter((action) => granted.some((row) => row.code === menu.code && row.action === action))
      }))
    };
  },

  async setPermissions(id, permissions, actor) {
    const role = await service.get(id);
    if (role.name === ADMIN_ROLE) throw AppError.badRequest('Hak akses Admin tidak dapat diubah (selalu penuh)');

    const rows = [];
    const saved = {};
    for (const [code, actions] of Object.entries(permissions)) {
      const menu = MENU_BY_CODE.get(code);
      if (!menu || !menu.actions.length) throw AppError.badRequest(`Menu tidak dikenal: ${code}`);
      const invalid = actions.filter((action) => !menu.actions.includes(action));
      if (invalid.length) throw AppError.badRequest(`Aksi ${invalid.join(', ')} tidak tersedia untuk menu ${code}`);
      const unique = menu.actions.filter((action) => actions.includes(action));
      if (unique.length) saved[code] = unique;
    }

    const menuIds = new Map((await db('menus').select('id', 'code')).map((menu) => [menu.code, menu.id]));
    for (const [code, actions] of Object.entries(saved)) {
      for (const action of actions) rows.push({ role_id: id, menu_id: menuIds.get(code), action });
    }

    // Old vs new grid per menu, e.g. { customers: ["view"] } → { customers: ["view", "add"] }.
    const current = await service.getPermissions(id);
    const previous = Object.fromEntries(current.menus.filter((menu) => menu.granted.length).map((menu) => [menu.code, menu.granted]));
    const codes = [...new Set([...Object.keys(previous), ...Object.keys(saved)])];
    const before = Object.fromEntries(codes.map((code) => [code, previous[code] ?? []]));
    const after = Object.fromEntries(codes.map((code) => [code, saved[code] ?? []]));

    await db.transaction(async (trx) => {
      await trx('role_permissions').where({ role_id: id }).delete();
      if (rows.length) await trx('role_permissions').insert(rows);
      await audit({ userId: actor.id, action: 'update_permissions', entity: 'roles', entityId: id, before, after }, trx);
    });
    return service.getPermissions(id);
  }
};

// ---- routes
const router = crudRouter({
  service,
  schemas: { list: listQuery, create: fields, update: updateFields },
  menu: 'roles'
});

router.get('/:id/permissions', requirePermission('roles', 'view'), validate({ params: idParams }), async (req, res) => {
  respond.ok(res, await service.getPermissions(req.valid.params.id));
});

router.put(
  '/:id/permissions',
  requirePermission('roles', 'edit'),
  validate({ params: idParams, body: permissionsBody }),
  async (req, res) => {
    const result = await service.setPermissions(req.valid.params.id, req.valid.body.permissions, req.user);
    respond.ok(res, result, 'Hak akses berhasil disimpan');
  }
);

module.exports = router;
