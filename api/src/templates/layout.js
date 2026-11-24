const fs = require('fs');
const path = require('path');

// Shared pieces for the lab's printed forms (Arial; "Liberation Sans" has the same metrics on Linux —
// the server needs the fonts-liberation package).

const LOGO = `data:image/jpeg;base64,${fs.readFileSync(path.join(__dirname, 'assets', 'logo-ltk.jpg')).toString('base64')}`;

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escapes text for HTML; null/undefined → ''. Use for every value that comes from data. */
const esc = (value) => (value === null || value === undefined ? '' : String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]));

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
/** "20 Februari 2026" (Indonesian long date); '' when empty. */
function longDate(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

const CSS = `
  @page { size: A4; }
  * { box-sizing: border-box; }
  body { font-family: Arial, "Liberation Sans", Helvetica, sans-serif; font-size: 10pt; color: #000; margin: 0; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px; }
  .header img { height: 42px; }
  .header .lab { text-align: right; font-size: 8pt; line-height: 1.35; }
  .header .lab strong { font-size: 9.5pt; }
  h1 { font-size: 13pt; text-align: center; margin: 8px 0 2px; text-transform: uppercase; }
  .form-code { text-align: center; font-size: 8pt; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; }
  table.grid th, table.grid td { border: 1px solid #000; padding: 4px 5px; vertical-align: top; }
  table.grid th { background: #eee; font-weight: bold; text-align: center; }
  table.info td { padding: 2px 4px; vertical-align: top; }
  table.info td.label { width: 32%; }
  table.info td.colon { width: 2%; }
  .center { text-align: center; }
  .right { text-align: right; }
  .small { font-size: 8pt; }
  .muted { color: #444; }
  .mt { margin-top: 12px; }
  .box { display: inline-block; width: 11px; height: 11px; border: 1px solid #000; text-align: center; line-height: 10px; font-size: 9pt; margin-right: 4px; vertical-align: middle; }
  .signs { display: flex; justify-content: space-between; margin-top: 18px; page-break-inside: avoid; }
  .sign { width: 45%; text-align: center; }
  .sign .space { height: 60px; }
  tr { page-break-inside: avoid; }
`;

/** A checkbox mark: [✓] when checked, [ ] otherwise. */
const box = (checked) => `<span class="box">${checked ? '&#10003;' : ''}</span>`;
/** V / X mark used on the Kaji Ulang form. */
const vx = (ok) => (ok ? 'V' : 'X');

function header(lab) {
  return `<div class="header">
    <img src="${LOGO}" alt="Lichem Teknologi Kalibrasi" />
    <div class="lab"><strong>${esc(lab.lab_name)}</strong><br/>${esc(lab.lab_address)}<br/>Telp. ${esc(lab.lab_phone)} · ${esc(lab.lab_email)}</div>
  </div>`;
}

/** Full HTML page: lab header, title, optional form code, body. */
function page({ lab, title, formCode, body }) {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"/><title>${esc(title)}</title><style>${CSS}</style></head>
  <body>${header(lab)}<h1>${esc(title)}</h1>${formCode ? `<div class="form-code">${esc(formCode)}</div>` : ''}${body}</body></html>`;
}

/** Label : value rows. rows = [[label, html]] (values must already be escaped). */
const infoTable = (rows) =>
  `<table class="info">${rows.map(([label, value]) => `<tr><td class="label">${esc(label)}</td><td class="colon">:</td><td>${value}</td></tr>`).join('')}</table>`;

const signature = ({ left, right }) =>
  `<div class="signs">${[left, right]
    .map((sign) =>
      sign
        ? `<div class="sign">${sign.top ? `${esc(sign.top)}<br/>` : ''}${esc(sign.role ?? '')}<div class="space"></div>( ${esc(sign.name || '………………………………')} )${sign.bottom ? `<br/>${esc(sign.bottom)}` : ''}</div>`
        : '<div class="sign"></div>'
    )
    .join('')}</div>`;

module.exports = { esc, longDate, page, infoTable, signature, box, vx };
