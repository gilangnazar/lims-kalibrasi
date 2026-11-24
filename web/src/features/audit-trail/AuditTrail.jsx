import { useState } from 'react';
import useSWR from 'swr';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';

import MainCard from 'components/MainCard';
import DataTable from 'components/crud/DataTable';
import { api } from 'lib/api';
import { useList } from 'lib/useResource';
import { entityLabel, eventBg, eventLabel, formatDateTime } from './labels';
import ValuesDiff from './ValuesDiff';

const PAGE_SIZE = 20;
const EMPTY_FILTERS = { entity: '', action: '', user_id: '', q: '' };
const fetchData = (path) => api.get(path).then((res) => res.data);
const userName = (user) => (user ? user.full_name || user.username : 'Sistem');

const columns = [
  { key: 'entity', header: 'Entitas', render: (row) => entityLabel(row.entity) },
  { key: 'entity_id', header: 'ID' },
  {
    key: 'action',
    header: 'Event',
    render: (row) => <Badge bg={eventBg(row.action)}>{eventLabel(row.action)}</Badge>
  },
  { key: 'created_at', header: 'Tanggal', render: (row) => formatDateTime(row.created_at) },
  { key: 'user', header: 'User', render: (row) => userName(row.user) }
];

function AuditDetail({ id, onHide }) {
  const { data, error, isLoading } = useSWR(id ? `/audit-logs/${id}` : null, fetchData);
  return (
    <Modal show={Boolean(id)} onHide={onHide} centered size="lg" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Detail Audit</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isLoading && <Spinner animation="border" size="sm" />}
        {error && <p className="text-danger">{error.message}</p>}
        {data && (
          <>
            <dl className="row mb-3">
              <dt className="col-sm-3">User</dt>
              <dd className="col-sm-9">{userName(data.user)}</dd>
              <dt className="col-sm-3">Event</dt>
              <dd className="col-sm-9">
                <Badge bg={eventBg(data.action)}>{eventLabel(data.action)}</Badge>
              </dd>
              <dt className="col-sm-3">Entitas</dt>
              <dd className="col-sm-9">
                {entityLabel(data.entity)} {data.entity_id && <span className="text-muted">#{data.entity_id}</span>}
              </dd>
              <dt className="col-sm-3">Waktu</dt>
              <dd className="col-sm-9">{formatDateTime(data.created_at)}</dd>
            </dl>
            <ValuesDiff oldValues={data.old_values} newValues={data.new_values} />
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Tutup
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// Audit trail viewer: filter by entity, event, user and text in the old/new values.
export default function AuditTrail() {
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);

  const { data: options } = useSWR('/audit-logs/filters', fetchData);
  const { rows, meta, error, isLoading } = useList('audit-logs', { page, limit: PAGE_SIZE, ...filters });

  const set = (key) => (e) => setDraft((current) => ({ ...current, [key]: e.target.value }));
  const apply = (event) => {
    event.preventDefault();
    setFilters(draft);
    setPage(1);
  };
  const reset = () => {
    setDraft(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  return (
    <>
      <MainCard className="table-card" title="Audit Trail">
        <Form onSubmit={apply} className="p-3 pb-0">
          <Row className="g-2 align-items-end">
            <Col md={3}>
              <Form.Label htmlFor="audit-entity">Entitas</Form.Label>
              <Form.Select id="audit-entity" size="sm" value={draft.entity} onChange={set('entity')}>
                <option value="">Semua</option>
                {(options?.entities ?? []).map((code) => (
                  <option key={code} value={code}>
                    {entityLabel(code)}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label htmlFor="audit-action">Event</Form.Label>
              <Form.Select id="audit-action" size="sm" value={draft.action} onChange={set('action')}>
                <option value="">Semua</option>
                {(options?.actions ?? []).map((code) => (
                  <option key={code} value={code}>
                    {eventLabel(code)}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label htmlFor="audit-user">User</Form.Label>
              <Form.Select id="audit-user" size="sm" value={draft.user_id} onChange={set('user_id')}>
                <option value="">Semua</option>
                {(options?.users ?? []).map((user) => (
                  <option key={user.id} value={user.id}>
                    {userName(user)}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Label htmlFor="audit-q">Cari nilai</Form.Label>
              <div className="d-flex gap-2">
                <Form.Control id="audit-q" size="sm" placeholder="Cari di nilai lama / baru" value={draft.q} onChange={set('q')} />
                <Button size="sm" type="submit">
                  Cari
                </Button>
                <Button size="sm" variant="light" onClick={reset}>
                  Reset
                </Button>
              </div>
            </Col>
          </Row>
        </Form>
        <DataTable
          columns={columns}
          rows={rows}
          meta={meta}
          isLoading={isLoading}
          error={error}
          emptyText="Belum ada log"
          onPageChange={setPage}
          actions={(row) => (
            <Button size="sm" variant="light-primary" onClick={() => setDetailId(row.id)}>
              Detail
            </Button>
          )}
        />
      </MainCard>
      <AuditDetail id={detailId} onHide={() => setDetailId(null)} />
    </>
  );
}
