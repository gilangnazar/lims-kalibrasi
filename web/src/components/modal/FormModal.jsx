import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

export default function FormModal({ showModal, handleCloseModal, modalTitle, form, handleSubmit, submitButtonText = 'Simpan' }) {
  return (
    <Modal show={showModal} onHide={handleCloseModal} centered>
      <Modal.Header closeButton>
        <Modal.Title>{modalTitle}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{form}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleCloseModal}>
          Batal
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
          {submitButtonText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
