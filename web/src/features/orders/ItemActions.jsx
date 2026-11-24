import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';

import ConfirmDialog from 'components/modal/ConfirmDialog';
import ModalForm from 'components/form/ModalForm';
import { can } from 'config/permissions';
import { useAuth } from 'hooks/useAuth';
import { api, openFile } from 'lib/api';
import { useList } from 'lib/useResource';
import { useZodForm } from 'lib/useZodForm';
import ActionModal from './ActionModal';
import ItemFields, { EMPTY_ITEM, itemSchema } from './ItemFields';
import { DP_PAID_OR_LATER, useAssignableUsers } from './shared';

const editSchema = itemSchema.omit({ qty: true });
const toFormItem = (item) => {
  const values = { ...EMPTY_ITEM };
  for (const key of Object.keys(EMPTY_ITEM)) if (item?.[key] !== null && item?.[key] !== undefined) values[key] = item[key];
  values.equipment_id = item?.equipment_id ?? '';
  return values;
};

/** Add (with qty) or edit one item while the order is still a request. */
export function ItemFormModal({ show, order, item, onHide, run }) {
  const editing = Boolean(item);
  const { rows: methods } = useList('methods', { limit: 100, sort: 'name' }, { enabled: show });
  const { rows: equipment } = useList('equipment', { limit: 100, customer_id: order.customer_id }, { enabled: show });
  const form = useZodForm({
    schema: editing ? editSchema : itemSchema,
    defaultValues: editing ? toFormItem(item) : EMPTY_ITEM,
    onSubmit: async (values) => {
      await run(() => (editing ? api.put(`/order-items/${item.id}`, values) : api.post(`/orders/${order.id}/items`, { items: [values] })));
      onHide();
    }
  });
  return (
    <Modal show={show} onHide={onHide} centered size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>{editing ? `Edit Alat No. ${item.item_no}` : 'Tambah Alat'}</Modal.Title>
      </Modal.Header>
      {show && (
        <ModalForm onSubmit={form.submit} onCancel={onHide} error={form.formError} submitting={form.formState.isSubmitting}>
          <ItemFields form={form} methods={methods} equipment={equipment} showQty={!editing} />
        </ModalForm>
      )}
    </Modal>
  );
}

const text = (data, key) => {
  const value = data.get(key);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

/** Buttons for one item, by its status and the user's permissions. */
export default function ItemActions({ order, item, run }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(null); // 'edit' | 'receive' | 'photos' | 'check' | 'assign' | 'delete' | 'disagree'
  const [actionError, setActionError] = useState('');
  const close = () => {
    setOpen(null);
    setActionError('');
  };
  // One-click actions report API errors in the confirm dialog (or below the buttons).
  const attempt = (request) => run(request).then(close, (err) => setActionError(err.message));
  const team = order.onsite.team.map((member) => member.id);
  const users = useAssignableUsers(open === 'assign');

  const isRequest = order.status === 'requested';
  const dpPaid = DP_PAID_OR_LATER.includes(order.status) && order.status !== 'closed';
  const intake = can(user, 'intake', 'edit');
  const show = {
    edit: isRequest && can(user, 'orders', 'edit'),
    receive: intake && dpPaid && item.location === 'in_lab' && item.status === 'pending',
    photos: intake && item.location === 'in_lab' && ['received', 'checked'].includes(item.status),
    check:
      intake &&
      dpPaid &&
      ((item.location === 'in_lab' && item.status === 'received') ||
        (item.location === 'on_site' && item.status === 'pending' && Boolean(order.assignment_letter))),
    agree: intake && item.status === 'checked',
    assign: can(user, 'assignments', 'edit') && ['agreed', 'assigned'].includes(item.status)
  };
  const photos = item.attachments.filter((a) => a.kind === 'item_photo');
  const signatures = item.attachments.filter((a) => a.kind === 'client_signature');

  return (
    <div className="d-flex flex-wrap gap-1 justify-content-end">
      {actionError && !open && <div className="w-100 text-danger small">{actionError}</div>}
      {photos.map((photo, index) => (
        <Button key={photo.id} size="sm" variant="link" className="p-0 me-1" onClick={() => openFile(`/attachments/${photo.id}/file`)}>
          Foto {index + 1}
        </Button>
      ))}
      {signatures.map((file) => (
        <Button key={file.id} size="sm" variant="link" className="p-0 me-1" onClick={() => openFile(`/attachments/${file.id}/file`)}>
          Form TTD
        </Button>
      ))}
      {show.edit && (
        <>
          <Button size="sm" variant="warning" onClick={() => setOpen('edit')}>
            Edit
          </Button>
          <Button size="sm" variant="outline-danger" onClick={() => setOpen('delete')}>
            Hapus
          </Button>
        </>
      )}
      {show.receive && (
        <Button size="sm" onClick={() => setOpen('receive')}>
          Terima
        </Button>
      )}
      {show.photos && (
        <Button size="sm" variant="light-primary" onClick={() => setOpen('photos')}>
          Unggah Foto
        </Button>
      )}
      {show.check && (
        <Button size="sm" onClick={() => setOpen('check')}>
          Periksa
        </Button>
      )}
      {show.agree && (
        <>
          <Button
            size="sm"
            variant="success"
            onClick={() => attempt(() => api.post(`/order-items/${item.id}/customer-agreement`, { agreed: true }))}
          >
            Pelanggan Setuju
          </Button>
          <Button size="sm" variant="outline-danger" onClick={() => setOpen('disagree')}>
            Tidak Setuju
          </Button>
        </>
      )}
      {show.assign && (
        <Button size="sm" onClick={() => setOpen('assign')}>
          {item.status === 'assigned' ? 'Ganti Teknisi' : 'Tugaskan'}
        </Button>
      )}

      {show.edit && <ItemFormModal show={open === 'edit'} order={order} item={item} onHide={close} run={run} />}

      <ConfirmDialog
        show={open === 'delete'}
        message={`Hapus alat no. ${item.item_no} (${item.instrument_name}) dari permintaan?`}
        onConfirm={() => attempt(() => api.delete(`/order-items/${item.id}`))}
        onCancel={close}
        error={actionError}
      />

      <ConfirmDialog
        show={open === 'disagree'}
        title="Pelanggan Tidak Setuju"
        confirmText="Batalkan Order"
        message="Bila pelanggan tidak setuju, SELURUH order dibatalkan (final). Lanjutkan?"
        onConfirm={() => attempt(() => api.post(`/order-items/${item.id}/customer-agreement`, { agreed: false }))}
        onCancel={close}
        error={actionError}
      />

      <ActionModal
        show={open === 'receive'}
        title={`Terima Alat No. ${item.item_no}`}
        submitText="Terima"
        onHide={close}
        onSubmit={(data) =>
          run(() =>
            api.post(`/order-items/${item.id}/receive`, {
              condition: data.get('condition'),
              accessories: text(data, 'accessories'),
              notes: text(data, 'notes')
            })
          )
        }
      >
        <Form.Label className="d-block">Kondisi</Form.Label>
        <Form.Check inline type="radio" name="condition" id="cond-baik" value="baik" label="Baik" defaultChecked />
        <Form.Check inline type="radio" name="condition" id="cond-tidak" value="tidak_baik" label="Tidak Baik" />
        <Form.Group className="mt-3" controlId="receive-accessories">
          <Form.Label>Kelengkapan / Aksesoris</Form.Label>
          <Form.Control name="accessories" />
        </Form.Group>
        <Form.Group className="mt-3" controlId="receive-notes">
          <Form.Label>Catatan</Form.Label>
          <Form.Control as="textarea" rows={2} name="notes" />
        </Form.Group>
      </ActionModal>

      <ActionModal
        show={open === 'photos'}
        title={`Foto Alat No. ${item.item_no}`}
        submitText="Unggah"
        onHide={close}
        onSubmit={(data) => run(() => api.postForm(`/order-items/${item.id}/photos`, data))}
      >
        <Form.Group controlId="item-photos">
          <Form.Label>Foto (JPG/PNG/WebP, maks. 10 file, 8 MB per file)</Form.Label>
          <Form.Control type="file" name="photos" multiple accept="image/jpeg,image/png,image/webp" required />
        </Form.Group>
      </ActionModal>

      <ActionModal
        show={open === 'check'}
        title={`Pemeriksaan UUT — Alat No. ${item.item_no}`}
        submitText="Simpan Pemeriksaan"
        onHide={close}
        onSubmit={(data) => {
          if (!(data.get('file')?.size > 0)) data.delete('file');
          for (const key of ['check_notes', 'accessories']) if (!text(data, key)) data.delete(key);
          return run(() => api.postForm(`/order-items/${item.id}/check`, data));
        }}
      >
        {item.location === 'on_site' && (
          <>
            <Form.Label className="d-block">Kondisi</Form.Label>
            <Form.Check inline type="radio" name="condition" id="chk-baik" value="baik" label="Baik" defaultChecked />
            <Form.Check inline type="radio" name="condition" id="chk-tidak" value="tidak_baik" label="Tidak Baik" />
            <Form.Group className="mt-3" controlId="check-accessories">
              <Form.Label>Kelengkapan / Aksesoris</Form.Label>
              <Form.Control name="accessories" />
            </Form.Group>
          </>
        )}
        <Form.Group className="mt-3" controlId="check-notes">
          <Form.Label>Hasil Pemeriksaan / Catatan</Form.Label>
          <Form.Control as="textarea" rows={3} name="check_notes" />
        </Form.Group>
        <Form.Group className="mt-3" controlId="check-file">
          <Form.Label>Scan Serah Terima bertanda tangan pelanggan (opsional, PDF/JPG/PNG)</Form.Label>
          <Form.Control type="file" name="file" accept="application/pdf,image/jpeg,image/png" />
        </Form.Group>
      </ActionModal>

      <ActionModal
        show={open === 'assign'}
        title={`Tugaskan Alat No. ${item.item_no}`}
        submitText="Tugaskan"
        onHide={close}
        onSubmit={(data) => run(() => api.post(`/order-items/${item.id}/assign`, { user_id: Number(data.get('user_id')) }))}
      >
        <Form.Group controlId="assign-user">
          <Form.Label>Teknisi{item.location === 'on_site' && ' (anggota tim Surat Tugas)'}</Form.Label>
          <Form.Select name="user_id" defaultValue={item.assigned_to ?? ''} required>
            <option value="" disabled>
              — Pilih —
            </option>
            {users
              .filter((candidate) => item.location !== 'on_site' || team.includes(candidate.id))
              .map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.full_name} ({candidate.roles.join(', ')})
                </option>
              ))}
          </Form.Select>
        </Form.Group>
      </ActionModal>
    </div>
  );
}
