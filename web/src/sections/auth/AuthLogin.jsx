import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// react-bootstrap
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Image from 'react-bootstrap/Image';
import InputGroup from 'react-bootstrap/InputGroup';

// third-party
import { useForm } from 'react-hook-form';

// project-imports
import MainCard from 'components/MainCard';
import { useAuth } from 'hooks/useAuth';

// assets
import DarkLogo from 'assets/images/logo-dark.svg';

// ==============================|| AUTH LOGIN FORM ||============================== //

export default function AuthLoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm();

  const onSubmit = async ({ username, password }) => {
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login gagal');
    }
  };

  return (
    <MainCard className="mb-0">
      <div className="text-center">
        <Image src={DarkLogo} alt="LIMS Kalibrasi" />
      </div>

      {error && (
        <Alert variant="danger" className="mt-3">
          {error}
        </Alert>
      )}

      <Form onSubmit={handleSubmit(onSubmit)} noValidate>
        <h4 className="text-center f-w-500 mt-4 mb-3">Login LIMS Kalibrasi</h4>

        <Form.Group className="mb-3" controlId="formUsername">
          <Form.Label>Username</Form.Label>
          <Form.Control
            type="text"
            autoComplete="username"
            {...register('username', { required: 'Username wajib diisi' })}
            isInvalid={!!errors.username}
          />
          <Form.Control.Feedback type="invalid">{errors.username?.message}</Form.Control.Feedback>
        </Form.Group>

        <Form.Group className="mb-3" controlId="formPassword">
          <Form.Label>Password</Form.Label>
          <InputGroup hasValidation>
            <Form.Control
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              {...register('password', { required: 'Password wajib diisi' })}
              isInvalid={!!errors.password}
            />
            <Button
              variant="outline-secondary"
              onClick={() => setShowPassword((prev) => !prev)}
              type="button"
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              <i className={showPassword ? 'ti ti-eye' : 'ti ti-eye-off'} />
            </Button>
            <Form.Control.Feedback type="invalid">{errors.password?.message}</Form.Control.Feedback>
          </InputGroup>
        </Form.Group>

        <div className="text-center mt-4">
          <Button type="submit" className="shadow px-sm-4" disabled={isSubmitting}>
            {isSubmitting ? 'Memproses...' : 'Login'}
          </Button>
        </div>
      </Form>
    </MainCard>
  );
}
