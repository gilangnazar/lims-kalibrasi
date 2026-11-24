const express = require('express');
const authenticate = require('../middleware/authenticate');
const requirePermission = require('../middleware/requirePermission');
const validate = require('../middleware/validate');
const respond = require('./respond');
const { idParams } = require('./params');

/**
 * Standard list/get/create/update/delete routes for a resource.
 * The service must expose list(query), get(id), create(body, actor), update(id, body, actor), remove(id, actor).
 * schemas: { list, create, update } (zod). menu: registry code (config/menus.js) —
 * GET → view, POST → add, PUT → edit, DELETE → delete.
 */
function crudRouter({ service, schemas, menu }) {
  if (!menu) throw new Error('crudRouter: `menu` is required');
  const router = express.Router();
  router.use(authenticate);

  router.get('/', requirePermission(menu, 'view'), validate({ query: schemas.list }), async (req, res) => {
    respond.list(res, await service.list(req.valid.query));
  });

  router.get('/:id', requirePermission(menu, 'view'), validate({ params: idParams }), async (req, res) => {
    respond.ok(res, await service.get(req.valid.params.id));
  });

  router.post('/', requirePermission(menu, 'add'), validate({ body: schemas.create }), async (req, res) => {
    respond.created(res, await service.create(req.valid.body, req.user));
  });

  router.put(
    '/:id',
    requirePermission(menu, 'edit'),
    validate({ params: idParams, body: schemas.update }),
    async (req, res) => {
      respond.ok(res, await service.update(req.valid.params.id, req.valid.body, req.user), 'Data berhasil diperbarui');
    }
  );

  router.delete('/:id', requirePermission(menu, 'delete'), validate({ params: idParams }), async (req, res) => {
    await service.remove(req.valid.params.id, req.user);
    respond.ok(res, undefined, 'Data berhasil dihapus');
  });

  return router;
}

module.exports = crudRouter;
