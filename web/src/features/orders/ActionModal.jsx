import { useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';

/**
 * A dialog for one workflow action. `onSubmit(formData)` gets the <form>'s FormData; errors from the
 * API are shown in the dialog. Closes itself on success.
 */
export default function ActionModal({ show, title, onHide, onSubmit, submitText = 'Simpan', variant = 'primary', size, children }) {
  const [state, setState] = useState({ busy: false, error: '' });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setState({ busy: true, error: '' });
    try {
      await onSubmit(new FormData(event.currentTarget));
      setState({ busy: false, error: '' });
      onHide();
    } catch (err) {
      setState({ busy: false, error: err.message || 'Terjadi kesalahan' });
    }
  };

  const close = () => {
    setState({ busy: false, error: '' });
    onHide();
  };

  return (
    <Modal show={show} onHide={close} centered backdrop="static" size={size}>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {state.error && <Alert variant="danger">{state.error}</Alert>}
          {show && children}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={close} disabled={state.busy}>
            Batal
          </Button>
          <Button type="submit" variant={variant} disabled={state.busy}>
            {state.busy ? 'Memproses...' : submitText}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
