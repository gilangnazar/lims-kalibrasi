const { api, createUser, db } = require('./helpers');

let auth;
beforeEach(async () => {
  const { token } = await createUser('Admin');
  auth = { Authorization: `Bearer ${token}` };
});

const customer = {
  company_name: 'PT Maju Jaya',
  pic_name: 'Siti',
  email: 'siti@maju.co.id',
  phone: '+62 812-3456-7890',
  address: 'Jl. Merdeka 10'
};

describe('customers', () => {
  it('creates with a generated code and lists with pagination meta', async () => {
    const created = await api().post('/api/customers').set(auth).send(customer);
    expect(created.status).toBe(201);
    expect(created.body.data.code).toMatch(/^CUST-\d{4}$/);

    const list = await api().get('/api/customers?search=maju&limit=5').set(auth);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.meta).toMatchObject({ page: 1, limit: 5, total: 1, totalPages: 1 });
  });

  it('returns field-level validation errors', async () => {
    const res = await api()
      .post('/api/customers')
      .set(auth)
      .send({ ...customer, email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'email' })]));
  });

  it('accepts an empty update body (previously built invalid SQL)', async () => {
    const { body } = await api().post('/api/customers').set(auth).send(customer);
    const res = await api().put(`/api/customers/${body.data.id}`).set(auth).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.company_name).toBe(customer.company_name);
  });

  it('soft-deletes: hidden from the API but kept in the table', async () => {
    const { body } = await api().post('/api/customers').set(auth).send(customer);
    expect((await api().delete(`/api/customers/${body.data.id}`).set(auth)).status).toBe(200);
    expect((await api().get(`/api/customers/${body.data.id}`).set(auth)).status).toBe(404);
    expect(await db('customers').where({ id: body.data.id }).first()).toMatchObject({ company_name: customer.company_name });
  });
});

describe('standard instruments', () => {
  const instrument = { name: 'Anak Timbang', brand: 'Ohaus', serial_number: 'SN-1', status: 'tidak aktif', due_date: '2027-01-31' };

  it('rejects duplicate serial numbers with 409', async () => {
    expect((await api().post('/api/standard-instruments').set(auth).send(instrument)).status).toBe(201);
    expect((await api().post('/api/standard-instruments').set(auth).send(instrument)).status).toBe(409);
  });

  it('partial update keeps fields that were not sent, and dates stay YYYY-MM-DD', async () => {
    const { body } = await api().post('/api/standard-instruments').set(auth).send(instrument);
    const res = await api().put(`/api/standard-instruments/${body.data.id}`).set(auth).send({ brand: 'Mettler' });
    expect(res.body.data).toMatchObject({ brand: 'Mettler', status: 'tidak aktif', due_date: '2027-01-31' });
  });
});

describe('methods', () => {
  it('round-trips parameter_schema as an array', async () => {
    const parameter_schema = [{ name: 'Linearity', unit: 'g' }, { name: 'Repeatability' }];
    const { body } = await api().post('/api/methods').set(auth).send({ name: 'Timbangan', parameter_schema });
    expect(body.data.parameter_schema).toEqual([
      { name: 'Linearity', unit: 'g' },
      { name: 'Repeatability', unit: '' }
    ]);
  });

  it('requires at least one parameter', async () => {
    const res = await api().post('/api/methods').set(auth).send({ name: 'X', parameter_schema: [] });
    expect(res.status).toBe(400);
  });
});

describe('users', () => {
  it('cannot delete own account', async () => {
    const me = await api().get('/api/auth/me').set(auth);
    expect((await api().delete(`/api/users/${me.body.data.id}`).set(auth)).status).toBe(400);
  });

  it('keeps at least one active admin', async () => {
    const me = await api().get('/api/auth/me').set(auth);
    const teknisi = await db('roles').where({ name: 'Teknisi' }).first();
    const res = await api()
      .put(`/api/users/${me.body.data.id}`)
      .set(auth)
      .send({ role_ids: [teknisi.id] });
    expect(res.status).toBe(400);
  });

  it('requires a customer link for Customer users', async () => {
    const customer = await db('roles').where({ name: 'Customer' }).first();
    const res = await api()
      .post('/api/users')
      .set(auth)
      .send({ username: 'portal1', email: 'p@x.co', full_name: 'Portal', role_ids: [customer.id], password: 'password123' });
    expect(res.status).toBe(400);
  });
});
