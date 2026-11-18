import CrudPage from 'components/crud/CrudPage';
import StatusBadge from 'components/StatusBadge';
import StandardInstrumentForm from './StandardInstrumentForm';

const columns = [
  { key: 'name', header: 'Nama Alat' },
  { key: 'brand', header: 'Merk' },
  { key: 'model', header: 'Model' },
  { key: 'serial_number', header: 'Nomor Seri' },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge active={row.status === 'aktif'} /> },
  { key: 'due_date', header: 'Jatuh Tempo' }
];

export default function StandardInstrumentList() {
  return (
    <CrudPage
      resource="standard-instruments"
      title="Standard Instrument"
      entityLabel="Standard Instrument"
      columns={columns}
      FormComponent={StandardInstrumentForm}
      getItemName={(row) => `${row.name} (${row.serial_number})`}
    />
  );
}
