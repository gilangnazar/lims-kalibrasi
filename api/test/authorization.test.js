const { api, createUser, grant } = require('./helpers');

// DB-stored RBAC: Admin holds every action (synced); every other role starts with nothing and only
// gets what is granted. Each row: [role, grants, method, path, expected status].
const cases = [
  ['Admin', [], 'post', '/api/users', 400], // allowed (400 = reached validation)
  ['Admin', [], 'get', '/api/roles', 200],
  ['Admin', [], 'get', '/api/menus', 200],
  ['Admin', [], 'get', '/api/customers', 200],
  ['Admin', [], 'get', '/api/methods', 200],
  ['Admin', [], 'get', '/api/standard-instruments', 200],
  ['Teknisi', [], 'get', '/api/customers', 403], // nothing granted yet
  ['Finance', [], 'get', '/api/users', 403],
  ['Manajer Teknis', [], 'get', '/api/roles', 403],
  ['Admin Teknisi', [], 'get', '/api/menus', 403],
  ['Customer', [], 'get', '/api/customers', 403],
  ['Teknisi', ['customers:view'], 'get', '/api/customers', 200],
  ['Teknisi', ['customers:view'], 'post', '/api/customers', 403], // view ≠ add
  ['Finance', ['methods:view'], 'get', '/api/methods', 200],
  ['Finance', ['methods:view'], 'delete', '/api/methods/1', 403],
  ['Admin Teknisi', ['users:add'], 'post', '/api/users', 400],
  ['Manajer Teknis', ['roles:view'], 'get', '/api/roles', 200],
  ['Manajer Teknis', ['roles:view'], 'put', '/api/roles/1/permissions', 403]
];

describe('permission authorization', () => {
  it.each(cases)('%s with %j: %s %s → %i', async (role, grants, method, path, expected) => {
    if (grants.length) await grant(role, ...grants);
    const { token } = await createUser(role);
    const res = await api()[method](path).set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(expected);
  });

  it('returns 401 without a token on every protected mount', async () => {
    for (const path of ['/api/users', '/api/roles', '/api/menus', '/api/customers', '/api/methods', '/api/standard-instruments']) {
      expect((await api().get(path)).status).toBe(401);
    }
  });
});
