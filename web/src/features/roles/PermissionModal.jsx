import { useState } from 'react';
import useSWR from 'swr';
import Alert from 'react-bootstrap/Alert';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';

import { can } from 'config/permissions';
import { useAuth } from 'hooks/useAuth';
import { api } from 'lib/api';
import PermissionGrid from './PermissionGrid';

/** Loads and saves one role's permission grid. Saving refreshes the signed-in user's menu. */
export default function PermissionModal({ role, onHide }) {
  const { user, refreshUser } = useAuth();
  const key = role ? `/roles/${role.id}/permissions` : null;
  const { data, error, isLoading, mutate } = useSWR(key, (path) => api.get(path).then((res) => res.data));
  const [saveState, setSaveState] = useState({ saving: false, error: '', saved: false });

  const save = async (permissions) => {
    setSaveState({ saving: true, error: '', saved: false });
    try {
      const res = await api.put(key, { permissions });
      await mutate(res.data, { revalidate: false });
      await refreshUser(); // the signed-in user may hold this role
      setSaveState({ saving: false, error: '', saved: true });
    } catch (err) {
      setSaveState({ saving: false, error: err.message, saved: false });
    }
  };

  return (
    <Modal show={Boolean(role)} onHide={onHide} centered size="xl" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Hak Akses — {role?.name}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {saveState.saved && (
          <Alert variant="success" className="mb-3">
            Hak akses berhasil disimpan.
          </Alert>
        )}
        {error && <Alert variant="danger">{error.message}</Alert>}
        {isLoading && (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" />
          </div>
        )}
        {data && (
          <PermissionGrid
            key={role?.id}
            data={data}
            editable={can(user, 'roles', 'edit')}
            onSave={save}
            saving={saveState.saving}
            error={saveState.error}
          />
        )}
      </Modal.Body>
    </Modal>
  );
}
