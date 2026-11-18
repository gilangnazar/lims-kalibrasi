const crudRouter = require('../../lib/crudRouter');
const { ROLES } = require('../../config/roles');
const service = require('./service');
const schema = require('./schema');

module.exports = crudRouter({
  service,
  schemas: { list: schema.listUsers, create: schema.createUser, update: schema.updateUser },
  readRoles: [ROLES.ADMIN],
  writeRoles: [ROLES.ADMIN]
});
