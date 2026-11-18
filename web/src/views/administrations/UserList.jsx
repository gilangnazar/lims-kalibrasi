import { useState } from 'react';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';

import MainCard from 'components/MainCard';
import SecondaryTableProp from 'components/SecondaryTableProp';
import FormModal from 'components/modal/FormModal';
import UserForm from './UserForm';
import { useUsers, useDeleteUser } from 'hooks/useUser';

export default function UserList() {
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState('create');
  const [selectedData, setSelectedData] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const { users, loading, error } = useUsers();
  const { deleteUser } = useDeleteUser();

  const handleCreateClick = () => {
    setMode('create');
    setSelectedData(null);
    setShowModal(true);
  };

  const handleEditClick = (item) => {
    setMode('edit');
    setSelectedData(item);
    setShowModal(true);
  };

  const handleDeleteClick = async (id, username) => {
    if (window.confirm(`Yakin ingin menghapus user ${username}?`)) {
      try {
        setDeleteError('');
        await deleteUser(id);
      } catch (err) {
        setDeleteError(err.message);
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setMode('create');
    setSelectedData(null);
  };

  const handleSubmit = async () => {
    const success = await window.submitForm?.();
    if (success) {
      handleCloseModal();
    }
  };

  const modalTitle = mode === 'create' ? 'Tambah User' : 'Edit User';
  const submitButtonText = mode === 'create' ? 'Simpan' : 'Update';

  if (loading) {
    return (
      <MainCard className="table-card" title="Users">
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      </MainCard>
    );
  }

  return (
    <>
      <MainCard className="table-card" title="Users" secondary={<SecondaryTableProp onCreate={handleCreateClick} />}>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        {deleteError && (
          <Alert variant="danger" className="mb-3">
            {deleteError}
          </Alert>
        )}

        <Table responsive hover className="mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-4">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.username}</td>
                  <td>{item.email}</td>
                  <td>{item.role}</td>
                  <td>
                    <Button variant="warning" size="sm" onClick={() => handleEditClick(item)} className="me-2">
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteClick(item.id, item.username)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </MainCard>

      {/* Modal with Form */}
      <FormModal
        showModal={showModal}
        handleCloseModal={handleCloseModal}
        modalTitle={modalTitle}
        form={<UserForm initialData={selectedData} mode={mode} />}
        handleSubmit={handleSubmit}
        submitButtonText={submitButtonText}
      />
    </>
  );
}
