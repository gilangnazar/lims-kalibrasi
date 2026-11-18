import Modal from 'react-bootstrap/Modal';

/** Modal shell for a form. The form itself renders <ModalForm> (body + footer). */
export default function FormModal({ show, onHide, title, size, children }) {
  return (
    <Modal show={show} onHide={onHide} centered backdrop="static" size={size}>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      {show && children}
    </Modal>
  );
}
