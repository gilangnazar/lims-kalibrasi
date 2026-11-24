const { api, createUser, grant, db } = require('./helpers');
const { closeBrowser } = require('../src/lib/pdf');
const { DOCUMENTS } = require('../src/templates/orderDocuments');
const { esc, longDate } = require('../src/templates/layout');

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const LAB = { lab_name: 'PT LAB', lab_address: 'Jl. Lab', lab_phone: '021', lab_email: 'lab@x', lab_city: 'Bogor' };

afterAll(closeBrowser);

const sampleOrder = (overrides = {}) => ({
  order_no: 'LK-001/2026-11',
  status: 'in_progress',
  requested_at: '2026-11-20T03:00:00.000Z',
  company_name: 'PT <Contoh> & Co',
  customer_address: 'Jl. Raya 1',
  certificate_name: 'PT Contoh',
  certificate_address: 'Jl. Sertifikat',
  contact_name: 'Sari',
  calibrated_before: true,
  request_notes: null,
  due_at: null,
  other_costs: [{ description: 'Transport', qty: 1, unit: 'Day' }],
  contract_review: {
    decision: 'accepted',
    notes: 'OK',
    reviewer_name: 'Bu MT',
    reviewed_at: '2026-11-21',
    checklist: [{ order_item_id: 1, scope_ok: true, method_ok: false, standards_ok: true }]
  },
  onsite: {
    visits: [{ location: 'Pabrik', visit_start: '2026-12-01', visit_end: '2026-12-02' }],
    team: [{ id: 5, full_name: 'Pak Teknisi' }]
  },
  assignment_letter: { letter_no: 'ST/001/2026', issued_at: '2026-11-22', issued_by_name: 'Bu MT' },
  items: [
    {
      id: 1,
      item_no: 1,
      instrument_name: 'Oven',
      brand: 'Memmert',
      model: 'UN55',
      serial_number: 'SN-1',
      range: '(30 - 300) °C',
      resolution: '0,1 °C',
      extra_specs: { Volume: '<1m3' },
      location: 'on_site',
      status: 'checked',
      received_condition: 'baik',
      accessories: 'Kabel',
      check_notes: 'Fisik baik',
      checked_at: '2026-12-01',
      method_name: 'Suhu Enklosur'
    }
  ],
  ...overrides
});

describe('order document templates', () => {
  it('formats Indonesian dates and escapes data', () => {
    expect(longDate('2026-02-20')).toBe('20 Februari 2026');
    expect(esc('<b>&"')).toBe('&lt;b&gt;&amp;&quot;');
  });

  it.each(Object.keys(DOCUMENTS))('%s renders the order data, escaped', (kind) => {
    const html = DOCUMENTS[kind].render({ order: sampleOrder(), lab: LAB, inspector: 'Pak Pemeriksa' });
    expect(html).toContain('LK-001/2026-11');
    expect(html).not.toContain('<Contoh>');
    expect(html).toContain('Oven');
  });

  it('puts the Kaji Ulang marks and the Surat Tugas team where the forms have them', () => {
    const review = DOCUMENTS['contract-review'].render({ order: sampleOrder(), lab: LAB });
    expect(review).toMatch(/<td class="center">V<\/td>\s*<td class="center">X<\/td>/); // scope V, method X
    const letter = DOCUMENTS['assignment-letter'].render({ order: sampleOrder(), lab: LAB });
    expect(letter).toContain('ST/001/2026');
    expect(letter).toContain('1. Pak Teknisi');
    expect(letter).toContain('Lampiran Surat Tugas');
  });
});

describe('GET /orders/:id/documents/:kind/pdf', () => {
  it('renders a real PDF and refuses documents not ready yet or without print permission', async () => {
    const { token } = await createUser('Admin');
    const [customerId] = await db('customers').insert({
      company_name: 'PT PDF',
      pic_name: 'P',
      email: 'p@p.co',
      phone: '0811',
      address: 'Jl. PDF'
    });
    const [methodId] = await db('methods').insert({ name: 'Suhu', parameter_schema: '[]' });
    const created = await api()
      .post('/api/orders')
      .set(bearer(token))
      .send({ customer_id: customerId, items: [{ method_id: methodId, instrument_name: 'Oven', location: 'in_lab' }] });
    const id = created.body.data.id;

    const pdf = await api().get(`/api/orders/${id}/documents/order-request/pdf`).set(bearer(token)).buffer(true);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toBe('application/pdf');
    expect(Buffer.from(pdf.body).subarray(0, 5).toString()).toBe('%PDF-');

    expect((await api().get(`/api/orders/${id}/documents/assignment-letter/pdf`).set(bearer(token))).status).toBe(400);
    expect((await api().get(`/api/orders/${id}/documents/nope/pdf`).set(bearer(token))).status).toBe(400);

    await grant('Teknisi', 'orders:view');
    const { token: viewer } = await createUser('Teknisi');
    expect((await api().get(`/api/orders/${id}/documents/order-request/pdf`).set(bearer(viewer))).status).toBe(403);
  }, 60000);
});
