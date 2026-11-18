import { useState, useEffect } from 'react';
import Form from 'react-bootstrap/Form';

import { useCreateCustomer, useUpdateCustomer } from 'hooks/useCustomer';

export default function CustomerForm({ initialData, mode = 'create' }) {
  const [formData, setFormData] = useState({
    nama_alat: '',
    merk: '',
    serial_number: '',
    status: 'aktif'
  });

  const [error, setError] = useState('');
  const { create } = useCreateCustomer();
  const { update } = useUpdateCustomer();

  // If edit mode, populate form with existing data
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData(initialData);
    }
  }, [mode, initialData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Return form data for parent to use on submit
  // Add this method so parent can access formData
  if (typeof window !== 'undefined') {
    window.getFormData = () => formData;

    window.submitForm = async () => {
      try {
        setError('');
        if (mode === 'create') {
          await create(formData);
        } else {
          await update(initialData.id, formData);
        }

        return true;
      } catch (err) {
        setError(err.message);
        return false;
      }
    };
  }

  return (
    <Form>
      <Form.Group className="mb-3">
        <Form.Label>Nama Perusahaan</Form.Label>
        <Form.Control
          type="text"
          name="company_name"
          value={formData.company_name}
          onChange={handleInputChange}
          placeholder="Nama Perusahaan"
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Nama PIC</Form.Label>
        <Form.Control type="text" name="pic_name" value={formData.pic_name} onChange={handleInputChange} placeholder="Nama PIC" />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Email</Form.Label>
        <Form.Control type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Email" />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Nomor HP</Form.Label>
        <Form.Control type="text" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Nomor HP" />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Alamat</Form.Label>
        <Form.Control
          type="textarea"
          name="address"
          value={formData.address}
          onChange={handleInputChange}
          placeholder="Alamat Perusahaan"
        />
      </Form.Group>
    </Form>
  );
}
