// Document numbers in the lab's formats (placeholders from the samples; adjust here when the lab
// confirms). Each kind has a yearly sequence, taken with a row lock inside the caller's transaction.
//   order        LK-003/2026-02            (seq / year-month of the order)
//   surat_tugas  ST/003/2026               (placeholder — format still pending, TO-CONFIRM)
const pad = (value) => String(value).padStart(3, '0');

/** Next value of a yearly sequence. Must run inside a transaction (trx). */
async function nextSequence(trx, name, year) {
  await trx('number_sequences').insert({ name, year, last_value: 0 }).onConflict().ignore();
  const row = await trx('number_sequences').where({ name, year }).forUpdate().first();
  const value = row.last_value + 1;
  await trx('number_sequences').where({ name, year }).update({ last_value: value });
  return value;
}

const FORMATS = {
  order: (seq, date) => `LK-${pad(seq)}/${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
  surat_tugas: (seq, date) => `ST/${pad(seq)}/${date.getFullYear()}`
};

/** nextNumber(trx, 'order') → "LK-001/2026-11". `date` defaults to now (the sequence year follows it). */
async function nextNumber(trx, kind, date = new Date()) {
  const format = FORMATS[kind];
  if (!format) throw new Error(`numbering: unknown kind "${kind}"`);
  return format(await nextSequence(trx, kind, date.getFullYear()), date);
}

module.exports = { nextNumber, nextSequence };
