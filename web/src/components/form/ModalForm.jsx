import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';

/** Body + footer of a form inside <FormModal>. The submit button is a real submit, so Enter works too. */
export default function ModalForm({ onSubmit, onCancel, error, submitting, submitText = 'Simpan', children }) {
  return (
    <Form noValidate onSubmit={onSubmit}>
      <Modal.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}
        {children}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Batal
        </Button>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Menyimpan...' : submitText}
        </Button>
      </Modal.Footer>
    </Form>
  );
}
