const { api, createUser, grant, db } = require('./helpers');
const syncMenus = require('../src/lib/syncMenus');
const requirePermission = require('../src/middleware/requirePermission');

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const roleId = async (name) => (await db('roles').where({ name }).first()).id;

describe('RBAC — permissions', () => {
  it('gives a multi-role user the union of its roles', async () => {
    await grant('Teknisi', 'methods:view');
    await grant('Finance', 'customers:view');
    const { token } = await createUser(['Teknisi', 'Finance']);
    expect((await api().get('/api/methods').set(bearer(token))).status).toBe(200);
    expect((await api().get('/api/customers').set(bearer(token))).status).toBe(200);
    expect((await api().get('/api/users').set(bearer(token))).status).toBe(403);
  });

  it('applies a removed permission on the next request (same token)', async () => {
    const { token: adminToken } = await createUser('Admin');
    await grant('Teknisi', 'customers:view');
    const { token } = await createUser('Teknisi');
    expect((await api().get('/api/customers').set(bearer(token))).status).toBe(200);

    const id = await roleId('Teknisi');
    const res = await api().put(`/api/roles/${id}/permissions`).set(bearer(adminToken)).send({ permissions: {} });
    expect(res.status).toBe(200);
    expect((await api().get('/api/customers').set(bearer(token))).status).toBe(403);
  });

  it('supports a custom role end to end: create, grant, assign', async () => {
    const { token: adminToken } = await createUser('Admin');
    const { user, token } = await createUser('Teknisi');

    const created = await api().post('/api/roles').set(bearer(adminToken)).send({ name: 'Auditor', description: 'Lihat data' });
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    const saved = await api()
      .put(`/api/roles/${id}/permissions`)
      .set(bearer(adminToken))
      .send({ permissions: { 'standard-instruments': ['view'], customers: ['view', 'view'] } });
    expect(saved.status).toBe(200);
    const granted = Object.fromEntries(saved.body.data.menus.map((menu) => [menu.code, menu.granted]));
    expect(granted).toMatchObject({ 'standard-instruments': ['view'], customers: ['view'], methods: [] });

    const assigned = await api().put(`/api/users/${user.id}/roles`).set(bearer(adminToken)).send({ role_ids: [id] });
    expect(assigned.status).toBe(200);
    expect(assigned.body.data.roles.map((role) => role.name)).toEqual(['Auditor']);
    expect((await api().get('/api/standard-instruments').set(bearer(token))).status).toBe(200);

    const audit = await db('audit_logs').where({ entity: 'roles', entity_id: id, action: 'update_permissions' }).first();
    expect(audit).toBeTruthy();
  });

  it('rejects unknown menus and actions a menu does not allow', async () => {
    const { token } = await createUser('Admin');
    const id = await roleId('Teknisi');
    const send = (permissions) => api().put(`/api/roles/${id}/permissions`).set(bearer(token)).send({ permissions });
    expect((await send({ nope: ['view'] })).status).toBe(400);
    expect((await send({ menus: ['delete'] })).status).toBe(400);
    expect((await send({ customers: ['fly'] })).status).toBe(400);
  });

  it('keeps the Admin grid locked and full', async () => {
    const { token } = await createUser('Admin');
    const id = await roleId('Admin');
    expect((await api().put(`/api/roles/${id}/permissions`).set(bearer(token)).send({ permissions: {} })).status).toBe(400);
    const grid = await api().get(`/api/roles/${id}/permissions`).set(bearer(token));
    expect(grid.body.data.locked).toBe(true);
    for (const menu of grid.body.data.menus) expect(menu.granted).toEqual(menu.actions);
  });
});

describe('RBAC — roles', () => {
  it('protects system roles from delete and rename', async () => {
    const { token } = await createUser('Admin');
    const id = await roleId('Teknisi');
    expect((await api().delete(`/api/roles/${id}`).set(bearer(token))).status).toBe(400);
    expect((await api().put(`/api/roles/${id}`).set(bearer(token)).send({ name: 'Tech' })).status).toBe(400);
    expect((await api().put(`/api/roles/${id}`).set(bearer(token)).send({ description: 'Teknisi lab' })).status).toBe(200);
  });

  it('refuses to delete a custom role still assigned to a user', async () => {
    const { token } = await createUser('Admin');
    const created = await api().post('/api/roles').set(bearer(token)).send({ name: 'Sementara' });
    const { user } = await createUser('Teknisi');
    await api().put(`/api/users/${user.id}/roles`).set(bearer(token)).send({ role_ids: [created.body.data.id] });
    expect((await api().delete(`/api/roles/${created.body.data.id}`).set(bearer(token))).status).toBe(400);
  });

  it('fails at definition time for an unknown menu or action', () => {
    expect(() => requirePermission('nope', 'view')).toThrow(/unknown menu/);
    expect(() => requirePermission('menus', 'delete')).toThrow(/does not allow/);
  });
});

describe('RBAC — users and lockout', () => {
  it('keeps the last active Admin', async () => {
    const { user, token } = await createUser('Admin');
    const teknisi = await roleId('Teknisi');
    expect((await api().put(`/api/users/${user.id}/roles`).set(bearer(token)).send({ role_ids: [teknisi] })).status).toBe(400);
    expect((await api().put(`/api/users/${user.id}`).set(bearer(token)).send({ is_active: false })).status).toBe(400);

    await createUser('Admin'); // a second admin makes it allowed
    const res = await api().put(`/api/users/${user.id}/roles`).set(bearer(token)).send({ role_ids: [teknisi] });
    expect(res.status).toBe(200);
  });

  it('returns roles on users and filters the list by role', async () => {
    const { token } = await createUser('Admin');
    await createUser(['Teknisi', 'Finance']);
    const res = await api().get('/api/users?role=Finance').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].roles.map((role) => role.name)).toEqual(['Finance', 'Teknisi']);
  });

  it('refuses to mix the Customer role with staff roles', async () => {
    const { token } = await createUser('Admin');
    const ids = [await roleId('Customer'), await roleId('Teknisi')];
    const res = await api()
      .post('/api/users')
      .set(bearer(token))
      .send({ username: 'mix1', email: 'm@x.co', full_name: 'Mix', role_ids: ids, password: 'password123' });
    expect(res.status).toBe(400);
  });
});

describe('RBAC — session and menus', () => {
  it('returns permissions and only the visible, permitted menus from /auth/me', async () => {
    await grant('Teknisi', 'methods:view', 'methods:add');
    const { token } = await createUser('Teknisi');
    const me = await api().get('/api/auth/me').set(bearer(token));
    expect(me.status).toBe(200);
    expect(me.body.data.permissions).toEqual(['methods:add', 'methods:view']);
    expect(me.body.data.menus).toEqual([
      { code: 'master-data', label: 'Master Data', children: [{ code: 'methods', label: 'Metode Kalibrasi', path: '/methods' }] }
    ]);
  });

  it('lets Admin rename and hide menus, and syncMenus keeps those edits', async () => {
    const { token } = await createUser('Admin');
    const menu = await db('menus').where({ code: 'customers' }).first();
    const res = await api().put(`/api/menus/${menu.id}`).set(bearer(token)).send({ label: 'Klien', is_visible: false });
    expect(res.status).toBe(200);

    await db('menus').where({ id: menu.id }).update({ path: '/wrong' });
    await syncMenus(db);
    const after = await db('menus').where({ id: menu.id }).first();
    expect(after).toMatchObject({ label: 'Klien', is_visible: 0, path: '/customers' });

    const me = await api().get('/api/auth/me').set(bearer(token));
    const codes = me.body.data.menus.flatMap((group) => group.children.map((child) => child.code));
    expect(codes).not.toContain('customers');

    await db('menus').where({ id: menu.id }).update({ label: 'Pelanggan', is_visible: true }); // restore for other tests
  });

  it('never hides menu management', async () => {
    const { token } = await createUser('Admin');
    const menu = await db('menus').where({ code: 'menus' }).first();
    expect((await api().put(`/api/menus/${menu.id}`).set(bearer(token)).send({ is_visible: false })).status).toBe(400);
  });
});
