import { useState } from 'react';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';

import MainCard from 'components/MainCard';
import SecondaryTableProp from 'components/SecondaryTableProp';
import FormModal from 'components/modal/FormModal';
import CustomerForm from './CustomerForm';
import { useCustomers, useDeleteCustomer } from 'hooks/useCustomer';

export default function CustomerList() {
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState('create');
  const [selectedData, setSelectedData] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const { instruments, loading, error } = useCustomers();
  const { deleteInstrument } = useDeleteCustomer();

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

  const handleDeleteClick = async (id, nama_alat) => {
    if (window.confirm(`Yakin ingin menghapus ${nama_alat}?`)) {
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

  const modalTitle = mode === 'create' ? 'Tambah Standard Instruments' : 'Edit Standard Instruments';
  const submitButtonText = mode === 'create' ? 'Simpan' : 'Update';

  if (loading) {
    return (
      <MainCard className="table-card" title="Standard Instruments">
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      </MainCard>
    );
  }

  return (
    <>
      <MainCard className="table-card" title="Standard Instruments" secondary={<SecondaryTableProp onCreate={handleCreateClick} />}>
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
              <th>Nama Perusahaan</th>
              <th>Nama PIC</th>
              <th>Email</th>
              <th>Nomor HP</th>
              <th>Alamat</th>
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
                  <td>{item.company_name}</td>
                  <td>{item.pic_name}</td>
                  <td>{item.email}</td>
                  <td>{item.phone}</td>
                  <td>{item.address}</td>
                  <td>
                    <Button variant="warning" size="sm" onClick={() => handleEditClick(item)} className="me-2">
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteClick(item.id, item.company_name)}>
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
