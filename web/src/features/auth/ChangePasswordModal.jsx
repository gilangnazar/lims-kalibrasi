import { useState } from 'react';
import { z } from 'zod';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

import ModalForm from 'components/form/ModalForm';
import FormModal from 'components/modal/FormModal';
import { TextField } from 'components/form/Fields';
import { api } from 'lib/api';
import { useZodForm } from 'lib/useZodForm';

const schema = z
  .object({
    current_password: z.string().min(1, 'Wajib diisi'),
    new_password: z.string().min(8, 'Minimal 8 karakter').max(72),
    confirm_password: z.string()
  })
  .refine((v) => v.new_password === v.confirm_password, { path: ['confirm_password'], message: 'Konfirmasi password tidak sama' });

function ChangePasswordForm({ onDone, onCancel }) {
  const form = useZodForm({
    schema,
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
    onSubmit: async ({ current_password, new_password }) => {
      await api.post('/auth/change-password', { current_password, new_password });
      onDone();
    }
  });

  return (
    <ModalForm onSubmit={form.submit} onCancel={onCancel} error={form.formError} submitting={form.formState.isSubmitting}>
      <TextField form={form} name="current_password" label="Password saat ini" type="password" autoComplete="current-password" />
      <TextField form={form} name="new_password" label="Password baru" type="password" autoComplete="new-password" />
      <TextField form={form} name="confirm_password" label="Ulangi password baru" type="password" autoComplete="new-password" />
    </ModalForm>
  );
}

export default function ChangePasswordModal({ show, onHide }) {
  const [done, setDone] = useState(false);
  const close = () => {
    setDone(false);
    onHide();
  };

  return (
    <FormModal show={show} onHide={close} title="Ubah Password">
      {done ? (
        <>
          <Modal.Body>
            <Alert variant="success" className="mb-0">
              Password berhasil diubah.
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={close}>Tutup</Button>
          </Modal.Footer>
        </>
      ) : (
        <ChangePasswordForm onDone={() => setDone(true)} onCancel={close} />
      )}
    </FormModal>
  );
}
