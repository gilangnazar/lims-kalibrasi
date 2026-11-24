const bcrypt = require('bcryptjs');
const db = require('../../db');
const AppError = require('../../lib/AppError');
const audit = require('../../lib/audit');
const { applySearch, applySort, paginate } = require('../../lib/pagination');
const { rolesByUser } = require('../../lib/access');
const { ADMIN_ROLE } = require('../../config/menus');

// Never select password_hash outside this module.
const PUBLIC_COLUMNS = ['id', 'username', 'email', 'full_name', 'customer_id', 'is_active', 'created_at', 'updated_at'];

// `role` = first role's name, kept for the web until step 02 (multi-role UI); `roles` is the real list.
async function withRoles(users) {
  const map = await rolesByUser(users.map((user) => user.id));
  return users.map((user) => {
    const roles = map.get(user.id).map(({ id, name, is_customer_scope }) => ({ id, name, is_customer_scope }));
    return { ...user, is_active: Boolean(user.is_active), roles, role: roles[0]?.name ?? null };
  });
}

async function list({ page, limit, search, sort, role }) {
  const qb = db('users').select(PUBLIC_COLUMNS);
  if (role) {
    qb.whereIn('id', db('user_roles as ur').join('roles as r', 'r.id', 'ur.role_id').where('r.name', role).select('ur.user_id'));
  }
  applySearch(qb, search, ['username', 'email', 'full_name']);
  applySort(qb, sort, ['username', 'full_name', 'created_at']);
  const result = await paginate(qb, { page, limit });
  return { ...result, data: await withRoles(result.data) };
}

async function get(id) {
  const user = await db('users').select(PUBLIC_COLUMNS).where({ id }).first();
  if (!user) throw AppError.notFound('User tidak ditemukan');
  return (await withRoles([user]))[0];
}

/** Turns { role } or { role_ids } into role rows; null when neither is given. */
async function resolveRoles({ role, role_ids }) {
  if (role_ids) {
    const ids = [...new Set(role_ids)];
    const rows = await db('roles').whereIn('id', ids);
    if (rows.length !== ids.length) throw AppError.badRequest('Role tidak ditemukan');
    return rows;
  }
  if (role) {
    const row = await db('roles').where({ name: role }).first();
    if (!row) throw AppError.badRequest('Role tidak ditemukan');
    return [row];
  }
  return null;
}

// Customer-scope users (portal) must be linked to a customer and can't also hold staff roles.
async function assertCustomerLink(roles, customerId) {
  const scoped = roles.filter((role) => role.is_customer_scope);
  if (!scoped.length) return null;
  if (scoped.length !== roles.length) throw AppError.badRequest('Role pelanggan tidak dapat digabung dengan role staf');
  if (!customerId) throw AppError.badRequest('User dengan role Customer wajib terhubung ke pelanggan');
  const customer = await db('customers').where({ id: customerId }).whereNull('deleted_at').first();
  if (!customer) throw AppError.badRequest('Pelanggan tidak ditemukan');
  return customerId;
}

const hasAdmin = (roles) => roles.some((role) => role.name === ADMIN_ROLE);

// Guards against locking everyone out: at least one other active Admin must remain.
async function assertAnotherAdmin(id) {
  const [{ count }] = await db('users as u')
    .join('user_roles as ur', 'ur.user_id', 'u.id')
    .join('roles as r', 'r.id', 'ur.role_id')
    .where({ 'r.name': ADMIN_ROLE, 'u.is_active': true })
    .whereNot('u.id', id)
    .countDistinct({ count: 'u.id' });
  if (Number(count) === 0) throw AppError.badRequest('Tidak dapat menonaktifkan, menghapus, atau mencabut role Admin terakhir');
}

const replaceRoles = async (trx, userId, roles) => {
  await trx('user_roles').where({ user_id: userId }).delete();
  await trx('user_roles').insert(roles.map((role) => ({ user_id: userId, role_id: role.id })));
};

async function create(input, actor) {
  const roles = await resolveRoles(input);
  const customerId = await assertCustomerLink(roles, input.customer_id);
  const passwordHash = await bcrypt.hash(input.password, 10);

  const id = await db.transaction(async (trx) => {
    const [newId] = await trx('users').insert({
      username: input.username,
      email: input.email,
      full_name: input.full_name,
      customer_id: customerId,
      is_active: input.is_active,
      password_hash: passwordHash
    });
    await replaceRoles(trx, newId, roles);
    await audit(
      {
        userId: actor.id,
        action: 'create',
        entity: 'users',
        entityId: newId,
        changes: { username: input.username, roles: roles.map((role) => role.name) }
      },
      trx
    );
    return newId;
  });
  return get(id);
}

async function update(id, input, actor) {
  const current = await get(id);
  const newRoles = await resolveRoles(input);
  const roles = newRoles ?? current.roles;

  const losesAdmin =
    hasAdmin(current.roles) && current.is_active && ((newRoles && !hasAdmin(newRoles)) || input.is_active === false);
  if (losesAdmin) await assertAnotherAdmin(id);

  const patch = {};
  for (const key of ['email', 'full_name', 'is_active']) if (input[key] !== undefined) patch[key] = input[key];
  if (newRoles || input.customer_id !== undefined) {
    patch.customer_id = await assertCustomerLink(roles, input.customer_id !== undefined ? input.customer_id : current.customer_id);
  }
  if (input.password) patch.password_hash = await bcrypt.hash(input.password, 10);
  if (Object.keys(patch).length === 0 && !newRoles) return current;

  const { password_hash, ...logged } = patch;
  if (password_hash) logged.password = 'changed';
  if (newRoles) logged.roles = newRoles.map((role) => role.name);

  await db.transaction(async (trx) => {
    if (Object.keys(patch).length) await trx('users').where({ id }).update(patch);
    if (newRoles) await replaceRoles(trx, id, newRoles);
    await audit({ userId: actor.id, action: 'update', entity: 'users', entityId: id, changes: logged }, trx);
  });
  return get(id);
}

const setRoles = (id, roleIds, actor) => update(id, { role_ids: roleIds }, actor);

async function remove(id, actor) {
  if (id === actor.id) throw AppError.badRequest('Tidak dapat menghapus akun sendiri');
  const current = await get(id);
  if (hasAdmin(current.roles) && current.is_active) await assertAnotherAdmin(id);
  await db('users').where({ id }).delete();
  await audit({ userId: actor.id, action: 'delete', entity: 'users', entityId: id });
}

module.exports = { list, get, create, update, setRoles, remove, PUBLIC_COLUMNS };
