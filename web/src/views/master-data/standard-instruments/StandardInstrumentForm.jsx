import { useState, useEffect } from 'react';
import Form from 'react-bootstrap/Form';

import { useCreateStandardInstrument, useUpdateStandardInstrument } from 'hooks/useStandardInstrument';

export default function StandardInstrumentForm({ initialData, mode = 'create' }) {
  const [formData, setFormData] = useState({
    nama_alat: '',
    merk: '',
    serial_number: '',
    status: 'aktif'
  });

  const [error, setError] = useState('');
  const { create } = useCreateStandardInstrument();
  const { update } = useUpdateStandardInstrument();

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
        <Form.Label>Nama Alat</Form.Label>
        <Form.Control type="text" name="nama_alat" value={formData.nama_alat} onChange={handleInputChange} placeholder="Enter nama alat" />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Merek</Form.Label>
        <Form.Control type="text" name="merk" value={formData.merk} onChange={handleInputChange} placeholder="Enter merek" />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>SN</Form.Label>
        <Form.Control type="text" name="serial_number" value={formData.serial_number} onChange={handleInputChange} placeholder="Enter SN" />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Status</Form.Label>
        <Form.Select name="status" value={formData.status} onChange={handleInputChange}>
          <option value="aktif">Aktif</option>
          <option value="tidak aktif">Tidak Aktif</option>
        </Form.Select>
      </Form.Group>
    </Form>
  );
}
