const express = require('express');
const { z } = require('zod');
const db = require('../../db');
const AppError = require('../../lib/AppError');
const audit = require('../../lib/audit');
const authenticate = require('../../middleware/authenticate');
const requirePermission = require('../../middleware/requirePermission');
const validate = require('../../middleware/validate');
const respond = require('../../lib/respond');
const { idParams } = require('../../lib/params');
const { MENU_BY_CODE, ALWAYS_VISIBLE } = require('../../config/menus');

// Menu management: rename, reorder, hide. Structure and actions come from config/menus.js.
const updateBody = z
  .object({
    label: z.string().trim().min(1).max(100),
    sort_order: z.number().int().min(0).max(10000),
    is_visible: z.boolean()
  })
  .partial();

const toPublic = (menu) => ({
  id: menu.id,
  code: menu.code,
  label: menu.label,
  default_label: MENU_BY_CODE.get(menu.code)?.label ?? null,
  path: menu.path,
  sort_order: menu.sort_order,
  is_visible: Boolean(menu.is_visible),
  can_hide: !ALWAYS_VISIBLE.includes(menu.code),
  actions: typeof menu.actions === 'string' ? JSON.parse(menu.actions) : menu.actions
});

async function tree() {
  const menus = (await db('menus').orderBy(['sort_order', 'id'])).filter((menu) => MENU_BY_CODE.has(menu.code));
  return menus
    .filter((menu) => !menu.parent_id)
    .map((group) => ({ ...toPublic(group), children: menus.filter((menu) => menu.parent_id === group.id).map(toPublic) }));
}

const router = express.Router();
router.use(authenticate);

router.get('/', requirePermission('menus', 'view'), async (_req, res) => {
  respond.ok(res, await tree());
});

router.put('/:id', requirePermission('menus', 'edit'), validate({ params: idParams, body: updateBody }), async (req, res) => {
  const { id } = req.valid.params;
  const input = req.valid.body;
  const menu = await db('menus').where({ id }).first();
  if (!menu || !MENU_BY_CODE.has(menu.code)) throw AppError.notFound('Menu tidak ditemukan');
  if (input.is_visible === false && ALWAYS_VISIBLE.includes(menu.code)) {
    throw AppError.badRequest('Menu ini tidak dapat disembunyikan');
  }
  if (Object.keys(input).length) {
    await db('menus').where({ id }).update(input);
    await audit({ userId: req.user.id, action: 'update', entity: 'menus', entityId: id, before: menu, after: input });
  }
  respond.ok(res, toPublic(await db('menus').where({ id }).first()), 'Menu berhasil diperbarui');
});

module.exports = router;
