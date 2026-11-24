const { api, createUser, grant, db } = require('./helpers');
const { redact, diff, REDACTED } = require('../src/lib/audit');

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const customer = { company_name: 'PT Audit', pic_name: 'Ani', email: 'ani@audit.co', phone: '0811111111', address: 'Jl. A' };
const json = (value) => (typeof value === 'string' ? JSON.parse(value) : value);
const lastLog = async (where) => {
  const row = await db('audit_logs').where(where).orderBy('id', 'desc').first();
  return row && { ...row, old_values: json(row.old_values), new_values: json(row.new_values) };
};

describe('audit values', () => {
  it('redacts secrets at any depth', () => {
    const out = redact({ username: 'a', password: 'x', nested: { Token: 't', list: [{ refreshToken: 'r', ok: 1 }] } });
    expect(out).toEqual({ username: 'a', password: REDACTED, nested: { Token: REDACTED, list: [{ refreshToken: REDACTED, ok: 1 }] } });
  });

  it('keeps only changed fields on update, comparing MySQL 0/1 with booleans', () => {
    expect(diff({ a: 1, b: 'x', c: 1 }, { a: 1, b: 'y', c: true })).toEqual({ oldValues: { b: 'x' }, newValues: { b: 'y' } });
  });

  it('stores old and new values for create, update and delete', async () => {
    const { token } = await createUser('Admin');
    const created = await api().post('/api/customers').set(bearer(token)).send(customer);
    const id = created.body.data.id;
    expect((await lastLog({ entity: 'customers', action: 'create' })).new_values).toMatchObject({ company_name: 'PT Audit' });

    await api()
      .put(`/api/customers/${id}`)
      .set(bearer(token))
      .send({ ...customer, pic_name: 'Budi' });
    const update = await lastLog({ entity: 'customers', action: 'update' });
    expect(update.old_values).toEqual({ pic_name: 'Ani' });
    expect(update.new_values).toEqual({ pic_name: 'Budi' });

    await api().delete(`/api/customers/${id}`).set(bearer(token));
    expect((await lastLog({ entity: 'customers', action: 'delete' })).old_values).toMatchObject({
      company_name: 'PT Audit',
      pic_name: 'Budi'
    });
  });

  it('never stores a password or its hash', async () => {
    const { token } = await createUser('Admin');
    const teknisi = await db('roles').where({ name: 'Teknisi' }).first();
    const created = await api()
      .post('/api/users')
      .set(bearer(token))
      .send({ username: 'audit1', email: 'a@x.co', full_name: 'Audit', role_ids: [teknisi.id], password: 'rahasia123' });
    await api().put(`/api/users/${created.body.data.id}`).set(bearer(token)).send({ password: 'rahasia456' });

    const rows = await db('audit_logs').where({ entity: 'users', entity_id: created.body.data.id });
    const text = JSON.stringify(rows);
    expect(text).not.toMatch(/rahasia/);
    expect(text).not.toMatch(/\$2[aby]\$/); // bcrypt hash prefix
    const update = rows.find((row) => row.action === 'update');
    expect(json(update.new_values)).toEqual({ password_changed: true });
  });

  it('records the old and new permission grid', async () => {
    const { token } = await createUser('Admin');
    await grant('Teknisi', 'customers:view');
    const teknisi = await db('roles').where({ name: 'Teknisi' }).first();
    await api()
      .put(`/api/roles/${teknisi.id}/permissions`)
      .set(bearer(token))
      .send({ permissions: { customers: ['view', 'add'] } });
    const log = await lastLog({ entity: 'roles', action: 'update_permissions' });
    expect(log.old_values).toEqual({ customers: ['view'] });
    expect(log.new_values).toEqual({ customers: ['view', 'add'] });
  });

  it('writes nothing for an update that changes nothing', async () => {
    const { token } = await createUser('Admin');
    const created = await api().post('/api/customers').set(bearer(token)).send(customer);
    await api().put(`/api/customers/${created.body.data.id}`).set(bearer(token)).send(customer);
    expect(await lastLog({ entity: 'customers', action: 'update' })).toBeUndefined();
  });
});

describe('audit trail API', () => {
  it('needs audit-trail:view', async () => {
    const { token } = await createUser('Teknisi');
    expect((await api().get('/api/audit-logs').set(bearer(token))).status).toBe(403);
    await grant('Teknisi', 'audit-trail:view');
    expect((await api().get('/api/audit-logs').set(bearer(token))).status).toBe(200);
  });

  it('lists newest first with the user, filters, and shows detail', async () => {
    const { user, token } = await createUser('Admin');
    await api().post('/api/customers').set(bearer(token)).send(customer);
    await api()
      .post('/api/customers')
      .set(bearer(token))
      .send({ ...customer, company_name: 'PT Kedua' });
    await api()
      .post('/api/methods')
      .set(bearer(token))
      .send({ name: 'Suhu', parameter_schema: [{ name: 'Suhu', unit: '°C' }] });

    const all = await api().get('/api/audit-logs').set(bearer(token));
    expect(all.status).toBe(200);
    expect(all.body.data[0]).toMatchObject({ entity: 'methods', action: 'create', user: { id: user.id } });
    expect(all.body.data[0].old_values).toBeUndefined(); // values only in the detail

    const byEntity = await api().get('/api/audit-logs?entity=customers').set(bearer(token));
    expect(byEntity.body.meta.total).toBe(2);

    const byText = await api().get('/api/audit-logs?q=Kedua').set(bearer(token));
    expect(byText.body.data).toHaveLength(1);

    const byUser = await api().get(`/api/audit-logs?user_id=${user.id}&action=create`).set(bearer(token));
    expect(byUser.body.meta.total).toBe(3);

    const detail = await api().get(`/api/audit-logs/${byText.body.data[0].id}`).set(bearer(token));
    expect(detail.body.data.new_values).toMatchObject({ company_name: 'PT Kedua' });
    expect(detail.body.data.old_values).toBeNull();

    const filters = await api().get('/api/audit-logs/filters').set(bearer(token));
    expect(filters.body.data.entities).toEqual(['customers', 'methods']);
    expect(filters.body.data.users.map((u) => u.id)).toEqual([user.id]);
  });
});
