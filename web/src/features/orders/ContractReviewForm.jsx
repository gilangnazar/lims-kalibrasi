import { useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Table from 'react-bootstrap/Table';

import { LOCATION } from './shared';

const CHECKS = [
  ['scope_ok', 'Ruang Lingkup'],
  ['method_ok', 'Metode'],
  ['standards_ok', 'Standar & Pendukung']
];

/**
 * Kaji Ulang (form LKAL-FRM 7.1-01) by the Manajer Teknis: V/X per item for scope, method and standards,
 * then the conclusion. The MT decides — an X does not force "ditolak".
 */
export default function ContractReviewForm({ items, onSubmit }) {
  const [checklist, setChecklist] = useState(() =>
    items.map((item) => ({ order_item_id: item.id, scope_ok: true, method_ok: true, standards_ok: true }))
  );
  const [notes, setNotes] = useState('');
  const [state, setState] = useState({ busy: false, error: '' });

  const toggle = (index, key) => setChecklist((rows) => rows.map((row, i) => (i === index ? { ...row, [key]: !row[key] } : row)));

  const submit = async (decision) => {
    setState({ busy: true, error: '' });
    try {
      await onSubmit({ decision, checklist, notes: notes.trim() || null });
    } catch (err) {
      setState({ busy: false, error: err.message });
    }
  };

  return (
    <>
      {state.error && <Alert variant="danger">{state.error}</Alert>}
      <Table size="sm" bordered responsive className="align-middle">
        <thead>
          <tr>
            <th>No</th>
            <th>Alat</th>
            <th>Lokasi</th>
            {CHECKS.map(([, label]) => (
              <th key={label} className="text-center">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id}>
              <td>{item.item_no}</td>
              <td>
                {item.instrument_name} <small className="text-muted">{item.method_name}</small>
              </td>
              <td>{LOCATION[item.location]}</td>
              {CHECKS.map(([key, label]) => (
                <td key={key} className="text-center">
                  <Form.Check
                    className="d-inline-block"
                    aria-label={`${label} alat ${item.item_no}`}
                    checked={checklist[index][key]}
                    onChange={() => toggle(index, key)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
      <Form.Group className="mb-3" controlId="review-notes">
        <Form.Label>Catatan</Form.Label>
        <Form.Control as="textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Form.Group>
      <div className="d-flex gap-2 justify-content-end">
        <Button variant="danger" disabled={state.busy} onClick={() => submit('not_accepted')}>
          Pekerjaan Ditolak
        </Button>
        <Button variant="success" disabled={state.busy} onClick={() => submit('accepted')}>
          Pekerjaan Dilanjutkan
        </Button>
      </div>
    </>
  );
}
