const bcrypt = require('bcryptjs');
const db = require('../../db');
const AppError = require('../../lib/AppError');
const audit = require('../../lib/audit');
const { applySearch, applySort, paginate } = require('../../lib/pagination');
const { ROLES } = require('../../config/roles');

// Never select password_hash outside this module.
const PUBLIC_COLUMNS = ['id', 'username', 'email', 'full_name', 'role', 'customer_id', 'is_active', 'created_at', 'updated_at'];

const toPublic = (user) => user && { ...user, is_active: Boolean(user.is_active) };

async function list({ page, limit, search, sort, role }) {
  const qb = db('users').select(PUBLIC_COLUMNS);
  if (role) qb.where({ role });
  applySearch(qb, search, ['username', 'email', 'full_name']);
  applySort(qb, sort, ['username', 'full_name', 'role', 'created_at']);
  const result = await paginate(qb, { page, limit });
  return { ...result, data: result.data.map(toPublic) };
}

async function get(id) {
  const user = await db('users').select(PUBLIC_COLUMNS).where({ id }).first();
  if (!user) throw AppError.notFound('User tidak ditemukan');
  return toPublic(user);
}

async function assertCustomerLink(role, customerId) {
  if (role !== ROLES.CUSTOMER) return null;
  if (!customerId) throw AppError.badRequest('User dengan role Customer wajib terhubung ke pelanggan');
  const customer = await db('customers').where({ id: customerId }).whereNull('deleted_at').first();
  if (!customer) throw AppError.badRequest('Pelanggan tidak ditemukan');
  return customerId;
}

async function create(input, actor) {
  const customerId = await assertCustomerLink(input.role, input.customer_id);
  const [id] = await db('users').insert({
    username: input.username,
    email: input.email,
    full_name: input.full_name,
    role: input.role,
    customer_id: customerId,
    is_active: input.is_active,
    password_hash: await bcrypt.hash(input.password, 10)
  });
  await audit({
    userId: actor.id,
    action: 'create',
    entity: 'users',
    entityId: id,
    changes: { username: input.username, role: input.role }
  });
  return get(id);
}

// Guards against locking everyone out: at least one active Admin must always remain.
async function assertNotLastAdmin(id) {
  const target = await db('users').where({ id }).first();
  if (!target || target.role !== ROLES.ADMIN || !target.is_active) return;
  const [{ count }] = await db('users').where({ role: ROLES.ADMIN, is_active: true }).count({ count: '*' });
  if (Number(count) <= 1) throw AppError.badRequest('Tidak dapat menonaktifkan atau menghapus Admin terakhir');
}

async function update(id, input, actor) {
  const current = await get(id);
  const role = input.role ?? current.role;
  const losesAdmin = current.role === ROLES.ADMIN && (role !== ROLES.ADMIN || input.is_active === false);
  if (losesAdmin) await assertNotLastAdmin(id);

  const patch = {};
  for (const key of ['email', 'full_name', 'role', 'is_active']) if (input[key] !== undefined) patch[key] = input[key];
  if (input.role !== undefined || input.customer_id !== undefined) {
    patch.customer_id = await assertCustomerLink(role, input.customer_id ?? current.customer_id);
  }
  if (input.password) patch.password_hash = await bcrypt.hash(input.password, 10);
  if (Object.keys(patch).length === 0) return current;

  await db('users').where({ id }).update(patch);
  const { password_hash, ...logged } = patch;
  await audit({
    userId: actor.id,
    action: 'update',
    entity: 'users',
    entityId: id,
    changes: password_hash ? { ...logged, password: 'changed' } : logged
  });
  return get(id);
}

async function remove(id, actor) {
  if (id === actor.id) throw AppError.badRequest('Tidak dapat menghapus akun sendiri');
  await get(id);
  await assertNotLastAdmin(id);
  await db('users').where({ id }).delete();
  await audit({ userId: actor.id, action: 'delete', entity: 'users', entityId: id });
}

module.exports = { list, get, create, update, remove, PUBLIC_COLUMNS, toPublic };
