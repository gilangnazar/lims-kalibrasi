const { api, createUser } = require('./helpers');

// Mirrors the role matrix in docs/PRD.md. Each row: [role, method, path, expected status].
const customer = { company_name: 'PT A', pic_name: 'A', email: 'a@a.co', phone: '0811111111', address: 'Jl. A' };

const cases = [
  ['Admin', 'post', '/api/users', 400], // allowed (400 = reached validation)
  ['Teknisi', 'post', '/api/users', 403],
  ['Manajer Teknis', 'get', '/api/users', 403],
  ['Admin Teknisi', 'get', '/api/customers', 200],
  ['Finance', 'get', '/api/customers', 200],
  ['Teknisi', 'post', '/api/customers', 403],
  ['Finance', 'get', '/api/methods', 403],
  ['Finance', 'get', '/api/standard-instruments', 403],
  ['Teknisi', 'get', '/api/methods', 200],
  ['Teknisi', 'delete', '/api/methods/1', 403],
  ['Customer', 'get', '/api/customers', 403],
  ['Customer', 'get', '/api/standard-instruments', 403]
];

describe('role authorization', () => {
  it.each(cases)('%s %s %s → %i', async (role, method, path, expected) => {
    let overrides = {};
    if (role === 'Customer') {
      const { token: adminToken } = await createUser('Admin');
      const created = await api().post('/api/customers').set('Authorization', `Bearer ${adminToken}`).send(customer);
      overrides = { customer_id: created.body.data.id };
    }
    const { token } = await createUser(role, overrides);
    const res = await api()[method](path).set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(expected);
  });
});
