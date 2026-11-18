import { useState, useEffect } from 'react';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';

import { useCreateMethod, useUpdateMethod } from 'hooks/useMethod';

export default function MethodForm({ initialData, mode = 'create' }) {
  const [formData, setFormData] = useState({
    nama_metode: '',
    deskripsi: '',
    parameter_schema: []
  });

  const [parameterInput, setParameterInput] = useState('');
  const [error, setError] = useState('');
  const { create } = useCreateMethod();
  const { update } = useUpdateMethod();

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        nama_metode: initialData.nama_metode,
        deskripsi: initialData.deskripsi,
        parameter_schema: Array.isArray(initialData.parameter_schema)
          ? initialData.parameter_schema
          : typeof initialData.parameter_schema === 'string'
            ? JSON.parse(initialData.parameter_schema)
            : []
      });
    }
  }, [mode, initialData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAddParameter = () => {
    if (parameterInput.trim()) {
      setFormData({
        ...formData,
        parameter_schema: [...formData.parameter_schema, parameterInput]
      });
      setParameterInput(''); // Clear input
    }
  };

  const handleRemoveParameter = (index) => {
    setFormData({
      ...formData,
      parameter_schema: formData.parameter_schema.filter((_, i) => i !== index)
    });
  };

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
      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}

      <Form.Group className="mb-3">
        <Form.Label>Nama Metode</Form.Label>
        <Form.Control
          type="text"
          name="nama_metode"
          value={formData.nama_metode}
          onChange={handleInputChange}
          placeholder="Nama Metode"
          required
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Deskripsi</Form.Label>
        <Form.Control
          type="text"
          name="deskripsi"
          value={formData.deskripsi}
          onChange={handleInputChange}
          placeholder="Deskripsi"
          required
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Parameter Schema</Form.Label>
        <div className="d-flex gap-2 mb-2">
          <Form.Control
            type="text"
            value={parameterInput}
            onChange={(e) => setParameterInput(e.target.value)}
            placeholder="Enter parameter name"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddParameter();
              }
            }}
          />
          <Button variant="primary" onClick={handleAddParameter} type="button">
            + Add
          </Button>
        </div>

        {/* Display added parameters */}
        <div className="mb-2">
          {formData.parameter_schema.length === 0 ? (
            <p className="text-muted">No parameters added yet</p>
          ) : (
            <div>
              {formData.parameter_schema.map((param, index) => (
                <div key={index} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded">
                  <span>{param}</span>
                  <Button variant="danger" size="sm" onClick={() => handleRemoveParameter(index)} type="button">
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Form.Group>
    </Form>
  );
}
