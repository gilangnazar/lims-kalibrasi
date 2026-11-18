import { useState } from 'react';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';

import MainCard from 'components/MainCard';
import SecondaryTableProp from 'components/SecondaryTableProp';
import FormModal from 'components/modal/FormModal';
import CustomerForm from './MethodForm';
import { useMethods, useDeleteMethod } from 'hooks/useMethod';

export default function CustomerList() {
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState('create');
  const [selectedData, setSelectedData] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const { instruments, loading, error } = useMethods();
  const { deleteInstrument } = useDeleteMethod();

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

  const handleDeleteClick = async (id, nama_metode) => {
    if (window.confirm(`Yakin ingin menghapus ${nama_metode}?`)) {
      try {
        setDeleteError('');
        await deleteInstrument(id);
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

  const formatParameters = (schema) => {
    try {
      if (typeof schema === 'string') {
        return JSON.parse(schema).join(', ');
      }
      if (Array.isArray(schema)) {
        return schema.join(', ');
      }
      return 'N/A';
    } catch {
      return 'N/A';
    }
  };

  const modalTitle = mode === 'create' ? 'Tambah Metode' : 'Edit Metode';
  const submitButtonText = mode === 'create' ? 'Simpan' : 'Update';

  if (loading) {
    return (
      <MainCard className="table-card" title="Metode">
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      </MainCard>
    );
  }

  return (
    <>
      <MainCard className="table-card" title="Metode" secondary={<SecondaryTableProp onCreate={handleCreateClick} />}>
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
              <th>Nama Metode</th>
              <th>Deskripsi</th>
              <th>Parameter</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {instruments.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-4">
                  No Customer Found
                </td>
              </tr>
            ) : (
              instruments.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.nama_metode}</td>
                  <td>{item.deskripsi}</td>
                  <td>{formatParameters(item.parameter_schema)}</td>
                  <td>
                    <Button variant="warning" size="sm" onClick={() => handleEditClick(item)} className="me-2">
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteClick(item.id, item.nama_metode)}>
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
        form={<CustomerForm initialData={selectedData} mode={mode} />}
        handleSubmit={handleSubmit}
        submitButtonText={submitButtonText}
      />
    </>
  );
}
