import { useState } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';

import { can } from 'config/permissions';
import { useAuth } from 'hooks/useAuth';
import { openFile } from 'lib/api';

// Printed forms of the order flow; each appears once the order reaches the stage it belongs to
// (same rules as the API).
export const DOCUMENTS = [
  { kind: 'order-request', label: 'Formulir Permintaan Kalibrasi', ready: () => true },
  { kind: 'contract-review', label: 'Formulir Kaji Ulang', ready: (order) => Boolean(order.contract_review) },
  { kind: 'uut-communication', label: 'Formulir Komunikasi UUT', ready: () => true },
  {
    kind: 'handover-check',
    label: 'Serah Terima dan Pemeriksaan UUT',
    ready: (order) => order.items.some((item) => item.received_at || item.checked_at)
  },
  { kind: 'assignment-letter', label: 'Surat Tugas', ready: (order) => Boolean(order.assignment_letter) }
];

export default function DocumentsMenu({ order }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!can(user, 'orders', 'print') && !can(user, 'assignments', 'print')) return null;

  const open = async (kind) => {
    setBusy(true);
    setError('');
    try {
      await openFile(`/orders/${order.id}/documents/${kind}/pdf`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dropdown>
      <Dropdown.Toggle size="sm" variant="light-secondary" disabled={busy}>
        <i className="ph ph-printer me-1" />
        {busy ? 'Membuat PDF...' : 'Cetak'}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {DOCUMENTS.filter((doc) => doc.ready(order)).map((doc) => (
          <Dropdown.Item key={doc.kind} onClick={() => open(doc.kind)}>
            {doc.label}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
      {error && <div className="text-danger small">{error}</div>}
    </Dropdown>
  );
}
