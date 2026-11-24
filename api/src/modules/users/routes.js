const crudRouter = require('../../lib/crudRouter');
const requirePermission = require('../../middleware/requirePermission');
const validate = require('../../middleware/validate');
const respond = require('../../lib/respond');
const { idParams } = require('../../lib/params');
const service = require('./service');
const schema = require('./schema');

const router = crudRouter({
  service,
  schemas: { list: schema.listUsers, create: schema.createUser, update: schema.updateUser },
  menu: 'users'
});

// Multi-role assignment (replaces the user's roles).
router.put(
  '/:id/roles',
  requirePermission('users', 'edit'),
  validate({ params: idParams, body: schema.setRoles }),
  async (req, res) => {
    respond.ok(res, await service.setRoles(req.valid.params.id, req.valid.body.role_ids, req.user), 'Role berhasil diperbarui');
  }
);

module.exports = router;
