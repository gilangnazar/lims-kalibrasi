import { useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';

import MainCard from 'components/MainCard';
import { can } from 'config/permissions';
import { useAuth } from 'hooks/useAuth';
import { api } from 'lib/api';
import { DP_PAID_OR_LATER, formatDate, useAssignableUsers } from './shared';

const EMPTY_VISIT = { location: '', visit_start: '', visit_end: '' };

function PlanModal({ show, order, onHide, run }) {
  const users = useAssignableUsers(show);
  const [visits, setVisits] = useState(order.onsite.visits.length ? order.onsite.visits.map((v) => ({ ...v })) : [{ ...EMPTY_VISIT }]);
  const [team, setTeam] = useState(order.onsite.team.map((member) => member.id));
  const [state, setState] = useState({ busy: false, error: '' });

  const setVisit = (index, key, value) => setVisits((rows) => rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  const toggle = (id) => setTeam((ids) => (ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]));

  const save = async () => {
    setState({ busy: true, error: '' });
    try {
      const body = { visits: visits.map(({ location, visit_start, visit_end }) => ({ location, visit_start, visit_end })), team };
      await run(() => api.put(`/orders/${order.id}/onsite`, body));
      setState({ busy: false, error: '' });
      onHide();
    } catch (err) {
      setState({ busy: false, error: err.details?.[0]?.message ? `${err.message}: ${err.details[0].message}` : err.message });
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Rencana On-site</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {state.error && <Alert variant="danger">{state.error}</Alert>}
        <h6>Lokasi & Jadwal Kunjungan</h6>
        {visits.map((visit, index) => (
          <Row key={index} className="g-2 mb-2 align-items-end">
            <Col md={6}>
              <Form.Control
                placeholder="Lokasi"
                aria-label={`Lokasi ${index + 1}`}
                value={visit.location}
                onChange={(e) => setVisit(index, 'location', e.target.value)}
              />
            </Col>
            <Col md={2}>
              <Form.Control
                type="date"
                aria-label={`Mulai ${index + 1}`}
                value={visit.visit_start}
                onChange={(e) => setVisit(index, 'visit_start', e.target.value)}
              />
            </Col>
            <Col md={2}>
              <Form.Control
                type="date"
                aria-label={`Selesai ${index + 1}`}
                value={visit.visit_end}
                onChange={(e) => setVisit(index, 'visit_end', e.target.value)}
              />
            </Col>
            <Col md={2}>
              {visits.length > 1 && (
                <Button
                  variant="outline-danger"
                  onClick={() => setVisits((rows) => rows.filter((_, i) => i !== index))}
                  aria-label={`Hapus kunjungan ${index + 1}`}
                >
                  <i className="ph ph-trash" />
                </Button>
              )}
            </Col>
          </Row>
        ))}
        <Button size="sm" variant="light-primary" onClick={() => setVisits((rows) => [...rows, { ...EMPTY_VISIT }])}>
          + Tambah kunjungan
        </Button>
        <h6 className="mt-4">Tim</h6>
        <div className="d-flex flex-wrap gap-3">
          {users.map((candidate) => (
            <Form.Check
              key={candidate.id}
              type="checkbox"
              id={`team-${candidate.id}`}
              label={`${candidate.full_name} (${candidate.roles.join(', ')})`}
              checked={team.includes(candidate.id)}
              onChange={() => toggle(candidate.id)}
            />
          ))}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={state.busy}>
          Batal
        </Button>
        <Button onClick={save} disabled={state.busy}>
          {state.busy ? 'Menyimpan...' : 'Simpan Rencana'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/** On-site items: visits, team and the order's single Surat Tugas (MT). */
export default function OnsitePanel({ order, run }) {
  const { user } = useAuth();
  const [planOpen, setPlanOpen] = useState(false);
  const [error, setError] = useState('');
  const editable = can(user, 'assignments', 'edit') && !['completed', 'closed', 'cancelled'].includes(order.status);
  const { visits, team } = order.onsite;
  const letter = order.assignment_letter;
  const canIssue = editable && !letter && DP_PAID_OR_LATER.includes(order.status) && visits.length > 0 && team.length > 0;

  const issue = async () => {
    setError('');
    try {
      await run(() => api.post(`/orders/${order.id}/assignment-letter`));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <MainCard
      title="On-site & Surat Tugas"
      secondary={
        <div className="d-flex gap-2">
          {editable && (
            <Button size="sm" variant="light-primary" onClick={() => setPlanOpen(true)}>
              {visits.length ? 'Ubah Rencana' : 'Atur Rencana'}
            </Button>
          )}
          {canIssue && (
            <Button size="sm" onClick={issue}>
              Terbitkan Surat Tugas
            </Button>
          )}
        </div>
      }
    >
      {error && <Alert variant="danger">{error}</Alert>}
      {!DP_PAID_OR_LATER.includes(order.status) && !letter && (
        <Alert variant="secondary" className="py-2">
          Surat Tugas dapat diterbitkan setelah DP dibayar.
        </Alert>
      )}
      <Row>
        <Col md={6}>
          <h6>Kunjungan</h6>
          {visits.length === 0 ? (
            <p className="text-muted">Belum diatur.</p>
          ) : (
            <ul className="mb-0">
              {visits.map((visit) => (
                <li key={visit.id}>
                  {visit.location} — {formatDate(visit.visit_start)} s.d. {formatDate(visit.visit_end)}
                </li>
              ))}
            </ul>
          )}
        </Col>
        <Col md={3}>
          <h6>Tim</h6>
          {team.length === 0 ? (
            <p className="text-muted">Belum diatur.</p>
          ) : (
            <ul className="mb-0">
              {team.map((m) => (
                <li key={m.id}>{m.full_name}</li>
              ))}
            </ul>
          )}
        </Col>
        <Col md={3}>
          <h6>Surat Tugas</h6>
          {letter ? (
            <p className="mb-0">
              <strong>{letter.letter_no}</strong>
              <br />
              <small className="text-muted">
                {formatDate(letter.issued_at)} · {letter.issued_by_name}
              </small>
            </p>
          ) : (
            <p className="text-muted">Belum diterbitkan.</p>
          )}
        </Col>
      </Row>
      {editable && planOpen && <PlanModal show={planOpen} order={order} onHide={() => setPlanOpen(false)} run={run} />}
    </MainCard>
  );
}
