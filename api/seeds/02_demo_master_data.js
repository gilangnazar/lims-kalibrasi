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
};
