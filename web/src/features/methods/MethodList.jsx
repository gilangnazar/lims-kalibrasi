import CrudPage from 'components/crud/CrudPage';
import MethodForm from './MethodForm';

const columns = [
  { key: 'code', header: 'Kode' },
  { key: 'name', header: 'Nama Metode' },
  {
    key: 'parameter_schema',
    header: 'Parameter',
    render: (row) => row.parameter_schema.map((p) => (p.unit ? `${p.name} (${p.unit})` : p.name)).join(', ')
  }
];

export default function MethodList() {
  return (
    <CrudPage
      resource="methods"
      title="Metode Kalibrasi"
      entityLabel="Metode"
      columns={columns}
      FormComponent={MethodForm}
      getItemName={(row) => row.name}
      modalSize="lg"
    />
  );
}
