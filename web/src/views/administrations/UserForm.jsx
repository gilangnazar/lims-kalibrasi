import { useState, useEffect } from 'react';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import { useCreateUser, useUpdateUser } from 'hooks/useUser';

export default function UserForm({ initialData, mode = 'create' }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'Teknisi'
  });
  const [error, setError] = useState('');
  const { createUser } = useCreateUser();
  const { updateUser } = useUpdateUser();

  // If edit mode, populate form
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        username: initialData.username,
        email: initialData.email,
        password: '',
        role: initialData.role
      });
    } else {
      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'Teknisi'
      });
    }
  }, [mode, initialData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Expose form data and submit function for parent
  if (typeof window !== 'undefined') {
    window.getFormData = () => formData;
    window.submitForm = async () => {
      try {
        setError('');

        if (mode === 'create') {
          await createUser(formData);
        } else {
          const updateData = {
            email: formData.email,
            role: formData.role
          };
          if (formData.password) {
            updateData.password = formData.password;
          }
          await updateUser(initialData.id, updateData);
        }

        return true; // Success
      } catch (err) {
        setError(err.message);
        return false; // Error
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
        <Form.Label>Username</Form.Label>
        <Form.Control
          type="text"
          name="username"
          value={formData.username}
          onChange={handleInputChange}
          placeholder="Enter username"
          disabled={mode === 'edit'}
          required
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Email</Form.Label>
        <Form.Control type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Enter email" required />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Password {mode === 'edit' && '(Leave empty to keep current)'}</Form.Label>
        <Form.Control
          type="password"
          name="password"
          value={formData.password}
          onChange={handleInputChange}
          placeholder="Enter password"
          required={mode === 'create'}
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Role</Form.Label>
        <Form.Select name="role" value={formData.role} onChange={handleInputChange}>
          <option value="Admin">Admin</option>
          <option value="Finance">Finance</option>
          <option value="Admin Teknisi">Admin Teknisi</option>
          <option value="Manajer Teknis">Manajer Teknis</option>
          <option value="Teknisi">Teknisi</option>
        </Form.Select>
      </Form.Group>
    </Form>
  );
}
