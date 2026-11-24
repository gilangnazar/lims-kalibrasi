const { esc, longDate, page, infoTable, signature, box, vx } = require('./layout');

// The lab's order-flow forms (samples in docs/lab-documents/). Each takes the order from
// orders.service.get() and the lab settings; values are escaped here.

const typeSerial = (item) => [item.model, item.serial_number && `S/N ${item.serial_number}`].filter(Boolean).map(esc).join(' / ');
const capacity = (item) => [item.range, item.resolution].filter(Boolean).map(esc).join(' / ');
const liveItems = (order) => order.items.filter((item) => item.status !== 'cancelled' || order.status === 'cancelled');

// 1. Formulir Permintaan Kalibrasi
function orderRequest({ order, lab }) {
  const rows = liveItems(order)
    .map(
      (item) => `<tr>
        <td class="center">${item.item_no}</td>
        <td>${esc(item.instrument_name)}${Object.entries(item.extra_specs)
          .filter(([, v]) => v)
          .map(([k, v]) => `<br/><span class="small">${esc(k)}: ${esc(v)}</span>`)
          .join('')}</td>
        <td>${esc(item.brand)}</td>
        <td>${typeSerial(item)}</td>
        <td>${capacity(item)}</td>
        <td>${esc(item.calibration_point)}</td>
        <td class="center">1</td>
      </tr>`
    )
    .join('');
  const costs = order.other_costs.length
    ? `<p class="mt"><strong>Biaya lain-lain:</strong> ${order.other_costs.map((c) => `${esc(c.description)} (${esc(c.qty)} ${esc(c.unit)})`).join('; ')}</p>`
    : '';
  const body = `
    ${infoTable([
      ['Nomor Surat', esc(order.order_no)],
      ['Tanggal', longDate(order.requested_at)],
      ['Nama Perusahaan', esc(order.company_name)],
      ['Alamat Perusahaan', esc(order.customer_address)],
      ['Kontak Pelanggan', esc(order.contact_name)],
      ['Telp/Fax/Email', [order.contact_phone, order.contact_email].filter(Boolean).map(esc).join(' / ')],
      [
        `Pernah melakukan kalibrasi ke ${lab.lab_name} sebelumnya`,
        `${box(order.calibrated_before)} YA &nbsp;&nbsp; ${box(!order.calibrated_before)} TIDAK`
      ]
    ])}
    <p class="mt">Dengan ini kami bermaksud mengajukan Permintaan Kalibrasi sesuai dengan data berikut ini:</p>
    ${infoTable([
      ['Nama Perusahaan di Sertifikat', esc(order.certificate_name)],
      ['Alamat Perusahaan di Sertifikat', esc(order.certificate_address)]
    ])}
    <table class="grid mt">
      <thead><tr><th>No</th><th>Nama Alat</th><th>Merk</th><th>Type / No. Seri</th><th>Kapasitas / Ketelitian</th><th>Titik Ukur (kalibrasi yang diminta)</th><th>Jumlah</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${costs}
    ${order.request_notes ? `<p><strong>Catatan:</strong> ${esc(order.request_notes)}</p>` : ''}
    <p class="mt small">Kami menyatakan bahwa data yang ditulis di atas benar dan apabila terjadi kesalahan yang dilakukan karena
    perubahan/kesalahan data oleh kami, maka kami sebagai pengguna jasa tidak akan menuntut penggantian atau revisi terhadap
    sertifikat hasil kalibrasi yang diterbitkan oleh Laboratorium Kalibrasi ${esc(lab.lab_name)}.</p>
    ${signature({ right: { top: `${lab.lab_city}, ${longDate(order.requested_at)}`, bottom: 'Client Representative' } })}`;
  return page({ lab, title: 'Formulir Permintaan Kalibrasi', body });
}

// 2. Formulir Kaji Ulang Permintaan Kalibrasi (LKAL-FRM 7.1-01)
function contractReview({ order, lab }) {
  const review = order.contract_review;
  const byItem = new Map((review?.checklist ?? []).map((row) => [row.order_item_id, row]));
  const rows = order.items
    .map((item) => {
      const check = byItem.get(item.id);
      const mark = (ok) => (check ? vx(ok) : '');
      return `<tr>
        <td class="center">${item.item_no}</td>
        <td>${[item.instrument_name, item.brand, item.model, item.range].filter(Boolean).map(esc).join(' / ')}</td>
        <td class="center">${mark(check?.scope_ok)}</td>
        <td class="center">${mark(check?.method_ok)}</td>
        <td class="center">${mark(check?.standards_ok)}</td>
        <td class="center">${item.location === 'on_site' ? 'V' : ''}</td>
        <td class="center">${item.location === 'in_lab' ? 'V' : ''}</td>
        <td class="center">1</td>
      </tr>`;
    })
    .join('');
  const body = `
    <p><strong>IDENTITAS PELANGGAN</strong></p>
    ${infoTable([
      ['Nama Perusahaan', esc(order.company_name)],
      ['Alamat', esc(order.customer_address)],
      ['No. Permintaan', esc(order.order_no)],
      ['Tanggal', longDate(order.requested_at)]
    ])}
    <table class="grid mt">
      <thead>
        <tr><th rowspan="2">No.</th><th rowspan="2">Nama Alat / Merk / Type / Rentang Ukur</th><th colspan="3">Kaji Ulang</th><th colspan="2">Pekerjaan Kalibrasi</th><th rowspan="2">Qty</th></tr>
        <tr><th>Ruang Lingkup</th><th>Metode</th><th>Standar &amp; Pendukung</th><th>Onsite</th><th>Internal Lab</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="small">*) Isi kolom dengan memberi tanda (V) bila sesuai dan tanda (X) bila tidak sesuai</p>
    <p class="mt"><strong>Kesimpulan Kaji Ulang</strong><br/>
      ${box(review?.decision === 'accepted')} Pekerjaan dilanjutkan &nbsp;&nbsp;&nbsp; ${box(review?.decision === 'not_accepted')} Pekerjaan ditolak</p>
    <p><strong>Catatan:</strong> ${esc(review?.notes) || '……………………………………'}</p>
    ${signature({ right: { top: `${lab.lab_city}, ${longDate(review?.reviewed_at)}`, role: '', name: review?.reviewer_name, bottom: 'Manajer Teknis' } })}`;
  return page({ lab, title: 'Formulir Kaji Ulang Permintaan Kalibrasi', formCode: 'LKAL-FRM 7.1-01', body });
}

// 3. Serah Terima dan Pemeriksaan UUT
function handoverCheck({ order, lab, inspector }) {
  const rows = liveItems(order)
    .map(
      (item) => `<tr>
        <td class="center">${item.item_no}</td>
        <td>${esc(item.instrument_name)}${item.serial_number ? `<br/>S/N : ${esc(item.serial_number)}` : ''}</td>
        <td class="center">${item.received_condition === 'baik' ? '&#10003;' : ''}</td>
        <td class="center">${item.received_condition === 'tidak_baik' ? '&#10003;' : ''}</td>
        <td>${esc(item.accessories)}</td>
        <td>${esc(item.check_notes)}</td>
      </tr>`
    )
    .join('');
  const checkedDates = order.items
    .map((item) => item.checked_at || item.received_at)
    .filter(Boolean)
    .sort();
  const body = `
    ${infoTable([
      ['No. Order', esc(order.order_no)],
      ['Nama Pelanggan', esc(order.company_name)],
      ['Kontak Pelanggan', [order.contact_name, order.contact_phone].filter(Boolean).map(esc).join(' · ') || esc(order.customer_address)]
    ])}
    <p class="mt"><strong>IDENTITAS SERTIFIKAT</strong></p>
    ${infoTable([
      ['Nama', esc(order.certificate_name)],
      ['Alamat', esc(order.certificate_address)]
    ])}
    <table class="grid mt">
      <thead>
        <tr><th rowspan="2">No.</th><th rowspan="2">Nama Alat</th><th colspan="4">Hasil Pemeriksaan UUT</th></tr>
        <tr><th>Baik*</th><th>Tidak Baik*</th><th>Aksesoris</th><th>Keterangan**</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="mt">Tanggal : ${longDate(checkedDates[checkedDates.length - 1])}<br/>
    <span class="small">Pemeriksaan berdasarkan visual setelah diterima / sebelum dilakukan kalibrasi</span></p>
    ${signature({ left: { role: 'Nama dan paraf Pemeriksa', name: inspector }, right: { role: 'Diketahui Oleh', bottom: 'Client Representative' } })}
    <p class="small">* Beri tanda (&#10003;) untuk yang sesuai &nbsp; ** Isi dengan informasi apabila terjadi ketidaknormalan pada UUT</p>`;
  return page({ lab, title: 'Serah Terima dan Pemeriksaan UUT', body });
}

// 4. Surat Tugas (+ lampiran: on-site item list)
function assignmentLetter({ order, lab }) {
  const letter = order.assignment_letter;
  const visits = order.onsite.visits
    .map((v) => `${esc(v.location)}, ${longDate(v.visit_start)}${v.visit_end !== v.visit_start ? ` s.d. ${longDate(v.visit_end)}` : ''}`)
    .join('; ');
  const team = order.onsite.team.map((member, index) => `${index + 1}. ${esc(member.full_name)}`).join('<br/>');
  const onsite = liveItems(order).filter((item) => item.location === 'on_site');
  const issued = longDate(letter?.issued_at);
  const body = `
    ${infoTable([
      ['Nomor', esc(letter?.letter_no)],
      ['Dasar', `Permintaan kalibrasi dengan nomor order ${esc(order.order_no)} (${esc(order.company_name)})`],
      ['Memberi Tugas Kepada', `Petugas/Pegawai Laboratorium Kalibrasi Lichem sebagai berikut:<br/>${team}`],
      ['Untuk', `Melakukan kalibrasi yang akan dilaksanakan pada: ${visits}`]
    ])}
    <ol class="mt">
      <li>Melaporkan kepada atasan langsung setelah selesai melaksanakan kalibrasi.</li>
      <li>Tidak menerima pemberian dalam bentuk apapun dan/atau dari siapapun dalam melaksanakan tugas.</li>
      <li>Melaksanakan tugas sebaik-baiknya dengan penuh rasa tanggung jawab.</li>
    </ol>
    ${signature({ right: { top: `${lab.lab_city}, ${issued}`, name: letter?.issued_by_name, bottom: 'Manajer Teknis' } })}
    <div style="page-break-before: always"></div>
    <h1>Lampiran Surat Tugas</h1>
    ${infoTable([
      ['Nomor', esc(letter?.letter_no)],
      ['Tanggal', issued]
    ])}
    <p class="mt">Daftar alat yang akan dilakukan kalibrasi on site:</p>
    <table class="grid">
      <thead><tr><th>No</th><th>Kategori</th><th>Nama Sample</th><th>Merk / Type / No. Seri</th></tr></thead>
      <tbody>${onsite
        .map(
          (item, index) =>
            `<tr><td class="center">${index + 1}</td><td>${esc(item.method_name)}</td><td>${esc(item.instrument_name)}</td><td>${[item.brand, typeSerial(item)].filter(Boolean).join(' / ')}</td></tr>`
        )
        .join('')}</tbody>
    </table>
    ${signature({ right: { top: `${lab.lab_city}, ${issued}`, name: letter?.issued_by_name, bottom: 'Manajer Teknis' } })}`;
  return page({ lab, title: 'Surat Tugas', body });
}

// 5. Formulir Komunikasi UUT (LKAL-FRM 7.4-02)
function uutCommunication({ order, lab }) {
  const received = order.items
    .map((item) => item.received_at || item.checked_at)
    .filter(Boolean)
    .sort()[0];
  const rows = liveItems(order)
    .map(
      (item) => `<tr>
        <td class="center">${item.item_no}</td>
        <td>${esc(item.instrument_name)}</td>
        <td>${esc(item.brand)}</td>
        <td>${[item.model, item.serial_number, item.identity_no].filter(Boolean).map(esc).join(' / ')}</td>
        <td>${esc(item.range)}</td>
        <td>${esc(item.usage_range)}</td>
        <td class="center">${item.location === 'on_site' ? 'On-site' : 'Lab'}</td>
        <td></td>
        <td>${esc(item.check_notes)}</td>
      </tr>`
    )
    .join('');
  const body = `
    ${infoTable([
      ['Tanggal Penerimaan', longDate(received)],
      ['Deadline', longDate(order.due_at)],
      ['No. Order', esc(order.order_no)]
    ])}
    <table class="grid mt">
      <thead><tr><th>No.</th><th>Nama Alat</th><th>Merek</th><th>Type / No Seri / No Inventory</th><th>Rentang Ukur</th><th>Rentang Pemakaian</th><th>Pelaksanaan Kalibrasi</th><th>Tanggal Selesai</th><th>Keterangan</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  return page({ lab, title: 'Formulir Komunikasi UUT', formCode: 'LKAL-FRM 7.4-02', body });
}

// kind → { render, ready(order) (when the document makes sense), title (file name) }
const DOCUMENTS = {
  'order-request': { render: orderRequest, title: 'Permintaan Kalibrasi', ready: () => true },
  'contract-review': { render: contractReview, title: 'Kaji Ulang', ready: (order) => Boolean(order.contract_review) },
  'handover-check': {
    render: handoverCheck,
    title: 'Serah Terima dan Pemeriksaan UUT',
    ready: (order) => order.items.some((item) => item.received_at || item.checked_at)
  },
  'assignment-letter': { render: assignmentLetter, title: 'Surat Tugas', ready: (order) => Boolean(order.assignment_letter) },
  'uut-communication': { render: uutCommunication, title: 'Komunikasi UUT', ready: () => true }
};

module.exports = { DOCUMENTS };
