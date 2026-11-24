const { api, createUser, grant, db } = require('./helpers');

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const PDF = Buffer.from('%PDF-1.4\n% test\n');
const PNG = Buffer.from('89504e470d0a1a0a', 'hex');

let admin;
let auth;
let customer;
let method;

beforeEach(async () => {
  admin = await createUser('Admin');
  auth = bearer(admin.token);
  [customer] = await db('customers').insert({
    company_name: 'PT Pelanggan',
    pic_name: 'Sari',
    email: 's@p.co',
    phone: '0811',
    address: 'Jl. Raya 1'
  });
  customer = await db('customers').where({ id: customer }).first();
  const [methodId] = await db('methods').insert({
    code: 'LKAL-IK/01.01/25',
    name: 'Suhu Enklosur',
    parameter_schema: JSON.stringify([{ name: 'Suhu', unit: '°C' }]),
    template_key: 'oven',
    extra_spec_fields: JSON.stringify(['Volume'])
  });
  method = await db('methods').where({ id: methodId }).first();
});

const itemRow = (overrides = {}) => ({
  method_id: method.id,
  instrument_name: 'Oven',
  brand: 'Memmert',
  range: '(30 - 300) °C',
  resolution: '0,1 °C',
  extra_specs: { Volume: '<1m3', Ignored: 'x' },
  location: 'in_lab',
  ...overrides
});

async function createOrder(body = {}) {
  const res = await api()
    .post('/api/orders')
    .set(auth)
    .send({
      customer_id: customer.id,
      items: [itemRow({ qty: 2 })],
      other_costs: [{ description: 'Transport', qty: 1, unit: 'Day' }],
      ...body
    });
  expect(res.status).toBe(201);
  return res.body.data;
}

// Request → Kaji Ulang accepted → quoted → PO → DP paid.
async function toDpPaid(order) {
  const checklist = order.items.map((item) => ({ order_item_id: item.id, scope_ok: true, method_ok: true, standards_ok: true }));
  expect((await api().post(`/api/orders/${order.id}/contract-review`).set(auth).send({ decision: 'accepted', checklist })).status).toBe(
    200
  );
  expect((await api().post(`/api/orders/${order.id}/transition`).set(auth).send({ to: 'quoted' })).status).toBe(200);
  const po = await api()
    .post(`/api/orders/${order.id}/po`)
    .set(auth)
    .field('po_no', 'PO-77')
    .field('po_date', '2026-11-20')
    .attach('file', PDF, 'po.pdf');
  expect(po.status).toBe(200);
  expect((await api().post(`/api/orders/${order.id}/transition`).set(auth).send({ to: 'dp_paid' })).status).toBe(200);
  return (await api().get(`/api/orders/${order.id}`).set(auth)).body.data;
}

describe('order request', () => {
  it('creates an order with a yearly number, splits qty into items and keeps only the method extra fields', async () => {
    const order = await createOrder();
    expect(order.order_no).toMatch(/^LK-001\/\d{4}-\d{2}$/);
    expect(order.status).toBe('requested');
    expect(order.certificate_name).toBe('PT Pelanggan'); // defaults from the customer
    expect(order.items.map((item) => item.item_no)).toEqual([1, 2]);
    expect(order.items[0].extra_specs).toEqual({ Volume: '<1m3' });
    expect(order.items[0].calibration_place).toBe('Lab. Lichem Teknologi Kalibrasi');
    expect(order.other_costs).toEqual([expect.objectContaining({ description: 'Transport', qty: 1, unit: 'Day' })]);

    const second = await createOrder();
    expect(second.order_no).toMatch(/^LK-002\//);
  });

  it('rejects equipment of another customer and unknown methods', async () => {
    const [otherCustomer] = await db('customers').insert({
      company_name: 'PT Lain',
      pic_name: 'L',
      email: 'l@l.co',
      phone: '0812',
      address: 'Jl. L'
    });
    const [equipmentId] = await db('equipment').insert({ customer_id: otherCustomer, name: 'Timbangan' });
    const res = await api()
      .post('/api/orders')
      .set(auth)
      .send({ customer_id: customer.id, items: [itemRow({ equipment_id: equipmentId })] });
    expect(res.status).toBe(400);
    const res2 = await api()
      .post('/api/orders')
      .set(auth)
      .send({ customer_id: customer.id, items: [itemRow({ method_id: 99999 })] });
    expect(res2.status).toBe(400);
  });

  it('edits items only before Kaji Ulang and keeps item numbers 1..n', async () => {
    const order = await createOrder({ items: [itemRow({ qty: 3 })] });
    const del = await api().delete(`/api/order-items/${order.items[0].id}`).set(auth);
    expect(del.status).toBe(200);
    expect(del.body.data.items.map((item) => item.item_no)).toEqual([1, 2]);

    const edit = await api()
      .put(`/api/order-items/${order.items[1].id}`)
      .set(auth)
      .send({ serial_number: 'SN-9', extra_specs: { Volume: '2 m3' } });
    expect(edit.status).toBe(200);
    expect(edit.body.data.items.find((item) => item.id === order.items[1].id)).toMatchObject({
      serial_number: 'SN-9',
      extra_specs: { Volume: '2 m3' }
    });

    const added = await api()
      .post(`/api/orders/${order.id}/items`)
      .set(auth)
      .send({ items: [itemRow({ instrument_name: 'Inkubator' })] });
    expect(added.body.data.items.map((item) => item.item_no)).toEqual([1, 2, 3]);

    const checklist = added.body.data.items.map((item) => ({
      order_item_id: item.id,
      scope_ok: true,
      method_ok: true,
      standards_ok: true
    }));
    await api().post(`/api/orders/${order.id}/contract-review`).set(auth).send({ decision: 'accepted', checklist });
    expect((await api().put(`/api/order-items/${order.items[1].id}`).set(auth).send({ serial_number: 'X' })).status).toBe(400);
    expect((await api().delete(`/api/orders/${order.id}`).set(auth)).status).toBe(400); // only requested orders
  });
});

describe('Kaji Ulang and transitions', () => {
  it('needs a checklist row for every item', async () => {
    const order = await createOrder();
    const res = await api()
      .post(`/api/orders/${order.id}/contract-review`)
      .set(auth)
      .send({
        decision: 'accepted',
        checklist: [{ order_item_id: order.items[0].id, scope_ok: true, method_ok: true, standards_ok: true }]
      });
    expect(res.status).toBe(400);
  });

  it('cancels the order and its items when the work is rejected (ditolak)', async () => {
    const order = await createOrder();
    const checklist = order.items.map((item) => ({ order_item_id: item.id, scope_ok: false, method_ok: true, standards_ok: true }));
    const res = await api()
      .post(`/api/orders/${order.id}/contract-review`)
      .set(auth)
      .send({ decision: 'not_accepted', checklist, notes: 'Di luar ruang lingkup' });
    expect(res.body.data.status).toBe('cancelled');
    expect(res.body.data.cancel_reason).toMatch(/Di luar ruang lingkup/);
    expect(res.body.data.items.every((item) => item.status === 'cancelled')).toBe(true);
    expect(res.body.data.contract_review).toMatchObject({ decision: 'not_accepted', reviewer_name: expect.any(String) });
  });

  it('allows only the defined manual transitions; a declined quotation returns to reviewed', async () => {
    const order = await createOrder();
    expect((await api().post(`/api/orders/${order.id}/transition`).set(auth).send({ to: 'dp_paid' })).status).toBe(400);
    const checklist = order.items.map((item) => ({ order_item_id: item.id, scope_ok: true, method_ok: true, standards_ok: true }));
    await api().post(`/api/orders/${order.id}/contract-review`).set(auth).send({ decision: 'accepted', checklist });
    await api().post(`/api/orders/${order.id}/transition`).set(auth).send({ to: 'quoted' });
    const declined = await api().post(`/api/orders/${order.id}/transition`).set(auth).send({ to: 'reviewed', reason: 'Harga' });
    expect(declined.body.data.status).toBe('reviewed');
  });

  it('cancels with a reason and orders:cancel only', async () => {
    const order = await createOrder();
    expect((await api().post(`/api/orders/${order.id}/transition`).set(auth).send({ to: 'cancelled' })).status).toBe(400);
    await grant('Teknisi', 'orders:view', 'orders:edit');
    const { token } = await createUser('Teknisi');
    expect((await api().post(`/api/orders/${order.id}/transition`).set(bearer(token)).send({ to: 'cancelled', reason: 'x' })).status).toBe(
      403
    );
    const ok = await api().post(`/api/orders/${order.id}/transition`).set(auth).send({ to: 'cancelled', reason: 'Batal' });
    expect(ok.body.data.status).toBe('cancelled');
  });

  it('records the PO with its file and confirms the order', async () => {
    const order = await toDpPaid(await createOrder());
    expect(order).toMatchObject({ status: 'dp_paid', po_no: 'PO-77', po_date: '2026-11-20' });
    expect(order.attachments).toEqual([expect.objectContaining({ kind: 'po', original_name: 'po.pdf' })]);
    const file = await api().get(`/api/attachments/${order.attachments[0].id}/file`).set(auth);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toMatch(/application\/pdf/);
  });

  it('refuses disallowed upload types', async () => {
    const order = await createOrder();
    const checklist = order.items.map((item) => ({ order_item_id: item.id, scope_ok: true, method_ok: true, standards_ok: true }));
    await api().post(`/api/orders/${order.id}/contract-review`).set(auth).send({ decision: 'accepted', checklist });
    await api().post(`/api/orders/${order.id}/transition`).set(auth).send({ to: 'quoted' });
    const res = await api()
      .post(`/api/orders/${order.id}/po`)
      .set(auth)
      .field('po_no', 'PO-1')
      .field('po_date', '2026-11-20')
      .attach('file', Buffer.from('x'), 'po.exe');
    expect(res.status).toBe(400);
  });
});

describe('in-lab intake', () => {
  it('blocks receipt before the DP is paid', async () => {
    const order = await createOrder();
    const res = await api().post(`/api/order-items/${order.items[0].id}/receive`).set(auth).send({ condition: 'baik' });
    expect(res.status).toBe(400);
  });

  it('receive → photos → check → agree → assign; the order starts', async () => {
    const order = await toDpPaid(await createOrder());
    const [item] = order.items;
    const received = await api()
      .post(`/api/order-items/${item.id}/receive`)
      .set(auth)
      .send({ condition: 'baik', accessories: 'Kabel power' });
    expect(received.body.data.status).toBe('in_progress');

    const photos = await api()
      .post(`/api/order-items/${item.id}/photos`)
      .set(auth)
      .attach('photos', PNG, 'a.png')
      .attach('photos', PNG, 'b.png');
    expect(photos.status).toBe(201);
    expect(photos.body.data.items[0].attachments.filter((a) => a.kind === 'item_photo')).toHaveLength(2);

    const checked = await api()
      .post(`/api/order-items/${item.id}/check`)
      .set(auth)
      .field('check_notes', 'Fisik baik')
      .attach('file', PDF, 'ttd.pdf');
    expect(checked.status).toBe(200);
    expect(checked.body.data.items[0]).toMatchObject({ status: 'checked', check_notes: 'Fisik baik' });

    const agreed = await api().post(`/api/order-items/${item.id}/customer-agreement`).set(auth).send({ agreed: true });
    expect(agreed.body.data.items[0].status).toBe('agreed');

    const { user: teknisi } = await createUser('Teknisi');
    const assigned = await api().post(`/api/order-items/${item.id}/assign`).set(auth).send({ user_id: teknisi.id });
    expect(assigned.body.data.items[0]).toMatchObject({ status: 'assigned', assigned_to: teknisi.id, assigned_name: teknisi.full_name });
  });

  it('cancels the whole order when the customer disagrees', async () => {
    const order = await toDpPaid(await createOrder());
    const [item] = order.items;
    await api().post(`/api/order-items/${item.id}/receive`).set(auth).send({ condition: 'tidak_baik' });
    await api().post(`/api/order-items/${item.id}/check`).set(auth).field('check_notes', 'Retak');
    const res = await api().post(`/api/order-items/${item.id}/customer-agreement`).set(auth).send({ agreed: false });
    expect(res.body.data.status).toBe('cancelled');
    expect(res.body.data.items.every((row) => row.status === 'cancelled')).toBe(true);
  });
});

describe('on-site', () => {
  it('needs the on-site plan and Surat Tugas before the check; assignees come from the team', async () => {
    const order = await toDpPaid(await createOrder({ items: [itemRow({ location: 'on_site' })] }));
    const [item] = order.items;
    expect(item.calibration_place).toBeNull();
    expect((await api().post(`/api/order-items/${item.id}/receive`).set(auth).send({ condition: 'baik' })).status).toBe(400);
    expect((await api().post(`/api/order-items/${item.id}/check`).set(auth).field('check_notes', 'x')).status).toBe(400);
    expect((await api().post(`/api/orders/${order.id}/assignment-letter`).set(auth)).status).toBe(400); // no plan yet

    const { user: teknisi } = await createUser('Teknisi');
    const { user: other } = await createUser('Teknisi');
    const plan = await api()
      .put(`/api/orders/${order.id}/onsite`)
      .set(auth)
      .send({ visits: [{ location: 'Pabrik Bogor', visit_start: '2026-12-01', visit_end: '2026-12-02' }], team: [teknisi.id] });
    expect(plan.status).toBe(200);
    const letter = await api().post(`/api/orders/${order.id}/assignment-letter`).set(auth);
    expect(letter.body.data.assignment_letter.letter_no).toMatch(/^ST\/001\/\d{4}$/);
    expect((await api().post(`/api/orders/${order.id}/assignment-letter`).set(auth)).status).toBe(409);

    const checked = await api().post(`/api/order-items/${item.id}/check`).set(auth).field('check_notes', 'OK').field('condition', 'baik');
    expect(checked.body.data).toMatchObject({ status: 'in_progress' });
    await api().post(`/api/order-items/${item.id}/customer-agreement`).set(auth).send({ agreed: 'true' });
    expect((await api().post(`/api/order-items/${item.id}/assign`).set(auth).send({ user_id: other.id })).status).toBe(400);
    expect((await api().post(`/api/order-items/${item.id}/assign`).set(auth).send({ user_id: teknisi.id })).status).toBe(200);
  });
});

describe('access', () => {
  it('lets Kaji Ulang, intake and assignment pages open an order, but not change it', async () => {
    const order = await createOrder();
    await grant('Manajer Teknis', 'contract-reviews:view');
    const { token } = await createUser('Manajer Teknis');
    expect((await api().get(`/api/orders/${order.id}`).set(bearer(token))).status).toBe(200);
    expect((await api().get('/api/orders').set(bearer(token))).status).toBe(200);
    expect((await api().put(`/api/orders/${order.id}`).set(bearer(token)).send({ notes: 'x' })).status).toBe(403);
    const checklist = order.items.map((item) => ({ order_item_id: item.id, scope_ok: true, method_ok: true, standards_ok: true }));
    expect(
      (await api().post(`/api/orders/${order.id}/contract-review`).set(bearer(token)).send({ decision: 'accepted', checklist })).status
    ).toBe(403);
  });

  it('shows a customer-scope user only their own company', async () => {
    const order = await createOrder();
    const [otherCustomer] = await db('customers').insert({
      company_name: 'PT Lain',
      pic_name: 'L',
      email: 'l@l.co',
      phone: '0812',
      address: 'Jl. L'
    });
    await grant('Customer', 'orders:view');
    const { token } = await createUser('Customer', { customer_id: otherCustomer });
    expect((await api().get(`/api/orders/${order.id}`).set(bearer(token))).status).toBe(404);
    expect((await api().get('/api/orders').set(bearer(token))).body.meta.total).toBe(0);
    expect((await api().get(`/api/attachments/1/file`).set(bearer(token))).status).toBe(404);
  });

  it('filters the list by status and location', async () => {
    await createOrder();
    await createOrder({ items: [itemRow({ location: 'on_site' })] });
    expect((await api().get('/api/orders?location=on_site').set(auth)).body.meta.total).toBe(1);
    expect((await api().get('/api/orders?status=requested').set(auth)).body.meta.total).toBe(2);
    expect((await api().get('/api/orders?status=cancelled').set(auth)).body.meta.total).toBe(0);
  });
});

describe('equipment registry', () => {
  it('CRUDs equipment per customer', async () => {
    const created = await api()
      .post('/api/equipment')
      .set(auth)
      .send({ customer_id: customer.id, name: 'Oven', brand: 'Memmert', identity_no: 'F.03/001' });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ company_name: 'PT Pelanggan' });
    const list = await api().get(`/api/equipment?customer_id=${customer.id}`).set(auth);
    expect(list.body.meta.total).toBe(1);
    expect((await api().post('/api/equipment').set(auth).send({ customer_id: 99999, name: 'X' })).status).toBe(400);
  });
});
