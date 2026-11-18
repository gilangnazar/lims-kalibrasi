import Button from 'react-bootstrap/Button';

export default function SecondaryTableProp({ onCreate }) {
  return (
    <div className="d-flex gap-4">
      <Button variant="light-primary" className="d-inline-flex" size="sm" onClick={onCreate}>
        <i className="ph ph-plus-square me-1 align-self-center" />
        Tambah
      </Button>
      <div className="d-flex">
        <input type="text" className="form-control form-control-sm" placeholder="Search..." />
        <Button size="sm" variant="light-primary" className="d-flex">
          <i className="ph ph-magnifying-glass align-self-center" />
        </Button>
      </div>
    </div>
  );
}
