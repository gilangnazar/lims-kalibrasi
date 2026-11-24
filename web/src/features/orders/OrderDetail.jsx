import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import Table from 'react-bootstrap/Table';

import MainCard from 'components/MainCard';
import ConfirmDialog from 'components/modal/ConfirmDialog';
import { can } from 'config/permissions';
import { useAuth } from 'hooks/useAuth';
import { api, openFile } from 'lib/api';
import ActionModal from './ActionModal';
import ContractReviewForm from './ContractReviewForm';
import DocumentsMenu from './DocumentsMenu';
import ItemActions, { ItemFormModal } from './ItemActions';
import OnsitePanel from './OnsitePanel';
import { CONDITION, formatDate, ITEM_STATUS, LOCATION, ORDER_STATUS, useOrder } from './shared';

const CANCELLABLE = ['requested', 'reviewed', 'quoted', 'confirmed', 'dp_paid', 'in_progress'];

function Field({ label, children }) {
  return (
    <Col sm={6} lg={4} className="mb-2">
      <small className="text-muted d-block">{label}</small>
      <span>{children || '-'}</span>
    </Col>
  );
}

/** Next workflow steps on the order itself, by status and permission. */
function OrderActions({ order, run }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(null); // 'po' | 'cancel' | 'delete' | 'decline'
  const [error, setError] = useState('');
  const close = () => setOpen(null);
  const transition = (to, reason) => run(() => api.post(`/orders/${order.id}/transition`, { to, reason }));
  const guarded = (fn) => () => fn().catch((err) => setError(err.message));
  const edit = can(user, 'orders', 'edit');

  return (
    <>
      {error && <Alert variant="danger">{error}</Alert>}
      <div className="d-flex flex-wrap gap-2">
        {order.status === 'reviewed' && edit && (
          <Button size="sm" onClick={guarded(() => transition('quoted'))} title="Sementara, sampai modul Penawaran (step 07) tersedia">
            Penawaran Dikirim
          </Button>
        )}
        {order.status === 'quoted' && edit && (
          <>
            <Button size="sm" onClick={() => setOpen('po')}>
              Catat PO
            </Button>
            <Button size="sm" variant="outline-warning" onClick={() => setOpen('decline')}>
              Penawaran Ditolak
            </Button>
          </>
        )}
        {order.status === 'confirmed' && edit && (
          <Button size="sm" onClick={guarded(() => transition('dp_paid'))} title="Sementara, sampai modul Invoice (step 08) tersedia">
            Tandai DP Lunas
          </Button>
        )}
        {order.status === 'requested' && can(user, 'orders', 'delete') && (
          <Button size="sm" variant="outline-danger" onClick={() => setOpen('delete')}>
            Hapus Permintaan
          </Button>
        )}
        {CANCELLABLE.includes(order.status) && can(user, 'orders', 'cancel') && (
          <Button size="sm" variant="danger" onClick={() => setOpen('cancel')}>
            Batalkan Order
          </Button>
        )}
      </div>

      <ActionModal
        show={open === 'po'}
        title="Catat PO Pelanggan"
        submitText="Simpan PO"
        onHide={close}
        onSubmit={(data) => {
          if (!(data.get('file')?.size > 0)) data.delete('file');
          return run(() => api.postForm(`/orders/${order.id}/po`, data));
        }}
      >
        <Form.Group controlId="po-no" className="mb-3">
          <Form.Label>No. PO</Form.Label>
          <Form.Control name="po_no" required maxLength={100} />
        </Form.Group>
        <Form.Group controlId="po-date" className="mb-3">
          <Form.Label>Tanggal PO</Form.Label>
          <Form.Control type="date" name="po_date" required />
        </Form.Group>
        <Form.Group controlId="po-file">
          <Form.Label>File PO (opsional, PDF/JPG/PNG)</Form.Label>
          <Form.Control type="file" name="file" accept="application/pdf,image/jpeg,image/png" />
        </Form.Group>
      </ActionModal>

      <ActionModal
        show={open === 'decline'}
        title="Penawaran Ditolak"
        submitText="Kembalikan ke Kaji Ulang Diterima"
        variant="warning"
        onHide={close}
        onSubmit={(data) => transition('reviewed', data.get('reason') || null)}
      >
        <Form.Group controlId="decline-reason">
          <Form.Label>Alasan (opsional)</Form.Label>
          <Form.Control as="textarea" rows={2} name="reason" />
        </Form.Group>
      </ActionModal>

      <ActionModal
        show={open === 'cancel'}
        title="Batalkan Order"
        submitText="Batalkan Order"
        variant="danger"
        onHide={close}
        onSubmit={(data) => transition('cancelled', data.get('reason'))}
      >
        <Alert variant="warning">Pembatalan bersifat final; untuk melanjutkan, buat order baru.</Alert>
        <Form.Group controlId="cancel-reason">
          <Form.Label>Alasan</Form.Label>
          <Form.Control as="textarea" rows={2} name="reason" required />
        </Form.Group>
      </ActionModal>

      <ConfirmDialog
        show={open === 'delete'}
        message={`Hapus permintaan ${order.order_no}?`}
        onConfirm={() =>
          api
            .delete(`/orders/${order.id}`)
            .then(() => navigate('/orders'))
            .catch((err) => setError(err.message))
        }
        onCancel={close}
      />
    </>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { order, error, isLoading, run } = useOrder(id);
  const [adding, setAdding] = useState(false);

  if (isLoading) return <Spinner animation="border" size="sm" />;
  if (error) return <Alert variant="danger">{error.message}</Alert>;
  if (!order) return null;

  const status = ORDER_STATUS[order.status];
  const review = order.contract_review;
  const hasOnsite = order.items.some((item) => item.location === 'on_site');
  const canReview = order.status === 'requested' && can(user, 'contract-reviews', 'approve');

  return (
    <>
      <MainCard
        title={
          <span>
            {order.order_no} <Badge bg={status?.bg}>{status?.label ?? order.status}</Badge>
          </span>
        }
        secondary={
          <div className="d-flex flex-wrap gap-2 align-items-start">
            <DocumentsMenu order={order} />
            <OrderActions order={order} run={run} />
          </div>
        }
      >
        {order.cancel_reason && <Alert variant="danger">Dibatalkan: {order.cancel_reason}</Alert>}
        <Row>
          <Field label="Pelanggan">
            {order.customer_code} · {order.company_name}
          </Field>
          <Field label="Nama pada Sertifikat">{order.certificate_name}</Field>
          <Field label="Alamat pada Sertifikat">{order.certificate_address}</Field>
          <Field label="Kontak">{[order.contact_name, order.contact_phone, order.contact_email].filter(Boolean).join(' · ')}</Field>
          <Field label="Tanggal Permintaan">{formatDate(order.requested_at)}</Field>
          <Field label="Pajak">
            {[order.apply_ppn && 'PPN', order.apply_pph23 && 'PPh 23'].filter(Boolean).join(', ') || 'Tanpa pajak'}
          </Field>
          <Field label="Pernah kalibrasi di Lichem">{order.calibrated_before ? 'Ya' : 'Tidak'}</Field>
          <Field label="PO">
            {order.po_no ? `${order.po_no} (${formatDate(order.po_date)})` : null}
            {order.attachments
              .filter((a) => a.kind === 'po')
              .map((a) => (
                <Button key={a.id} variant="link" size="sm" className="p-0 ms-2" onClick={() => openFile(`/attachments/${a.id}/file`)}>
                  Lihat file
                </Button>
              ))}
          </Field>
          <Field label="Catatan">{order.request_notes}</Field>
        </Row>
      </MainCard>

      {canReview && (
        <MainCard title="Kaji Ulang Permintaan (LKAL-FRM 7.1-01)">
          <ContractReviewForm items={order.items} onSubmit={(body) => run(() => api.post(`/orders/${order.id}/contract-review`, body))} />
        </MainCard>
      )}
      {review && (
        <MainCard title="Kaji Ulang">
          <p className="mb-1">
            <Badge bg={review.decision === 'accepted' ? 'success' : 'danger'}>
              {review.decision === 'accepted' ? 'Pekerjaan Dilanjutkan' : 'Pekerjaan Ditolak'}
            </Badge>{' '}
            <small className="text-muted">
              {review.reviewer_name} · {formatDate(review.reviewed_at)}
            </small>
          </p>
          {review.notes && <p className="mb-0">Catatan: {review.notes}</p>}
        </MainCard>
      )}

      <MainCard
        className="table-card"
        title="Alat"
        secondary={
          order.status === 'requested' &&
          can(user, 'orders', 'edit') && (
            <Button size="sm" variant="light-primary" onClick={() => setAdding(true)}>
              + Tambah Alat
            </Button>
          )
        }
      >
        <Table responsive hover className="mb-0 align-middle">
          <thead>
            <tr>
              <th>No</th>
              <th>Alat</th>
              <th>Metode</th>
              <th>Lokasi</th>
              <th>Status</th>
              <th>Pemeriksaan</th>
              <th className="text-end">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td>{item.item_no}</td>
                <td>
                  <strong>{item.instrument_name}</strong>
                  <div className="small text-muted">
                    {[
                      item.brand,
                      item.model,
                      item.serial_number && `SN ${item.serial_number}`,
                      item.identity_no && `ID ${item.identity_no}`
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  <div className="small text-muted">
                    {[
                      item.range && `Kapasitas ${item.range}`,
                      item.resolution && `Ketelitian ${item.resolution}`,
                      ...Object.entries(item.extra_specs).map(([k, v]) => v && `${k} ${v}`)
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </td>
                <td className="small">{item.method_name}</td>
                <td>{LOCATION[item.location]}</td>
                <td>
                  <Badge bg={ITEM_STATUS[item.status]?.bg}>{ITEM_STATUS[item.status]?.label ?? item.status}</Badge>
                  {item.assigned_name && <div className="small text-muted">{item.assigned_name}</div>}
                </td>
                <td className="small">
                  {item.received_condition && <div>Kondisi: {CONDITION[item.received_condition]}</div>}
                  {item.accessories && <div>Kelengkapan: {item.accessories}</div>}
                  {item.check_notes && <div>{item.check_notes}</div>}
                </td>
                <td className="text-end">
                  <ItemActions order={order} item={item} run={run} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </MainCard>

      {order.other_costs.length > 0 && (
        <MainCard title="Biaya Lain-lain">
          <ul className="mb-0">
            {order.other_costs.map((cost) => (
              <li key={cost.id}>
                {cost.description} — {cost.qty} {cost.unit}
              </li>
            ))}
          </ul>
        </MainCard>
      )}

      {hasOnsite && <OnsitePanel order={order} run={run} />}

      {adding && <ItemFormModal show={adding} order={order} onHide={() => setAdding(false)} run={run} />}
    </>
  );
}
