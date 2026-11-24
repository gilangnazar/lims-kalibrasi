import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

import MainCard from 'components/MainCard';
import DataTable from 'components/crud/DataTable';
import { can } from 'config/permissions';
import { useAuth } from 'hooks/useAuth';
import { useDebounced } from 'lib/useDebounced';
import { useList } from 'lib/useResource';
import { formatDate, ORDER_STATUS } from './shared';

const PAGE_SIZE = 20;

const columns = [
  { key: 'order_no', header: 'No. Order', render: (row) => <Link to={`/orders/${row.id}`}>{row.order_no}</Link> },
  { key: 'company_name', header: 'Pelanggan' },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge bg={ORDER_STATUS[row.status]?.bg}>{ORDER_STATUS[row.status]?.label ?? row.status}</Badge>
  },
  {
    key: 'item_count',
    header: 'Alat',
    render: (row) => (
      <>
        {row.item_count}
        {row.onsite_count > 0 && <small className="text-muted"> ({row.onsite_count} on-site)</small>}
      </>
    )
  },
  { key: 'requested_at', header: 'Tanggal Permintaan', render: (row) => formatDate(row.requested_at) }
];

/**
 * Order list. The Kaji Ulang, intake and assignment pages reuse it with a preset status list
 * (`statuses`) and their own title; only the Order page can create a request.
 */
export default function OrderList({ title = 'Order', statuses, defaultStatus = '', allowCreate = true }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(defaultStatus);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounced(searchInput.trim());
  useEffect(() => setPage(1), [search, status]);

  const options = statuses ?? Object.keys(ORDER_STATUS);
  const { rows, meta, error, isLoading } = useList('orders', { page, limit: PAGE_SIZE, search, status });

  const toolbar = (
    <div className="d-flex gap-2 flex-wrap">
      <Form.Select
        size="sm"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        aria-label="Filter status"
        style={{ minWidth: 180 }}
      >
        {!statuses && <option value="">Semua status</option>}
        {options.map((code) => (
          <option key={code} value={code}>
            {ORDER_STATUS[code].label}
          </option>
        ))}
      </Form.Select>
      <Form.Control
        size="sm"
        type="search"
        placeholder="Cari no. order / pelanggan..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        aria-label="Cari order"
        style={{ minWidth: 220 }}
      />
      {allowCreate && can(user, 'orders', 'add') && (
        <Button size="sm" variant="light-primary" className="text-nowrap" onClick={() => navigate('/orders/new')}>
          <i className="ph ph-plus-square me-1" />
          Permintaan Baru
        </Button>
      )}
    </div>
  );

  return (
    <MainCard className="table-card" title={title} secondary={toolbar}>
      <DataTable
        columns={columns}
        rows={rows}
        meta={meta}
        isLoading={isLoading}
        error={error}
        emptyText="Belum ada order"
        onPageChange={setPage}
        actions={(row) => (
          <Button size="sm" variant="light-primary" onClick={() => navigate(`/orders/${row.id}`)}>
            Buka
          </Button>
        )}
      />
    </MainCard>
  );
}

// The other order pages: preset to the statuses each role works on.
export const ContractReviewList = () => (
  <OrderList title="Kaji Ulang" statuses={['requested']} defaultStatus="requested" allowCreate={false} />
);
export const IntakeList = () => (
  <OrderList title="Penerimaan & Pemeriksaan" statuses={['dp_paid', 'in_progress']} defaultStatus="dp_paid" allowCreate={false} />
);
export const AssignmentList = () => (
  <OrderList title="Penugasan & Surat Tugas" statuses={['dp_paid', 'in_progress']} defaultStatus="in_progress" allowCreate={false} />
);
