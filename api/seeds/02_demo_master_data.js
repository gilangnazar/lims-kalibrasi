// Sample master data for local development. Skipped in production; skipped if data already exists.
exports.seed = async (knex) => {
  if (process.env.NODE_ENV === 'production') return;

  if (!(await knex('customers').first())) {
    const [id] = await knex('customers').insert({
      company_name: 'PT Contoh Industri',
      pic_name: 'Budi Santoso',
      email: 'budi@contoh.co.id',
      phone: '081234567890',
      address: 'Jl. Industri No. 1, Jakarta'
    });
    await knex('customers')
      .where({ id })
      .update({ code: `CUST-${String(id).padStart(4, '0')}` });
  }

  if (!(await knex('standard_instruments').first())) {
    await knex('standard_instruments').insert({
      name: 'Anak Timbang Kelas F1',
      brand: 'Mettler Toledo',
      model: 'F1-SET',
      serial_number: 'DEMO-STD-001',
      status: 'aktif'
    });
  }

  if (!(await knex('methods').first())) {
    await knex('methods').insert({
      code: 'MK-TIMB-01',
      name: 'Kalibrasi Timbangan Elektronik',
      description: 'Contoh metode kalibrasi timbangan.',
      parameter_schema: JSON.stringify([
        { name: 'Repeatability', unit: 'g' },
        { name: 'Linearity', unit: 'g' },
        { name: 'Eccentricity', unit: 'g' }
      ])
    });
  }

  // The MVP method (Enclosure / Oven), from docs/master-data/methods.csv (dummy until the lab's data).
  if (!(await knex('methods').where({ code: 'LKAL-IK/01.01/25' }).first())) {
    await knex('methods').insert({
      code: 'LKAL-IK/01.01/25',
      name: 'Instruksi Kerja Suhu Enklosur',
      description: 'Kalibrasi oven / enklosur suhu',
      parameter_schema: JSON.stringify([{ name: 'Suhu', unit: '°C' }]),
      template_key: 'oven',
      reference: 'KAN Pd-02-04 : 2019, Pedoman Kalibrasi Enklosur Suhu - Revisi 0',
      uncertainty_reference: 'JCGM 100-2008 : Evaluation of measurement data - Guide to expression of uncertainty in measurement',
      remarks: JSON.stringify([
        'Ketidakpastian pengukuran diestimasi pada tingkat kepercayaan 95% dengan faktor cakupan (k) = 2',
        'Hasil kalibrasi yang dilaporkan dapat ditelusuri ke satuan SI melalui laboratorium kalibrasi yang terakreditasi'
      ]),
      extra_spec_fields: JSON.stringify(['Volume']),
      is_accredited: false
    });
  }

  // A demo instrument in the customer equipment registry (pre-fills order items).
  const demoCustomer = await knex('customers').orderBy('id').first();
  if (demoCustomer && !(await knex('equipment').first())) {
    await knex('equipment').insert({
      customer_id: demoCustomer.id,
      name: 'Oven',
      brand: 'Memmert',
      model: 'UN55',
      serial_number: 'DEMO-OVEN-001',
      identity_no: 'F.03/001/SAI/2022',
      range: '(30 - 300) °C',
      resolution: '0,1 °C'
    });
  }
};
