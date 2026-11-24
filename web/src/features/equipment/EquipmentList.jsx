import CrudPage from 'components/crud/CrudPage';
import EquipmentForm from './EquipmentForm';

const columns = [
  { key: 'company_name', header: 'Pelanggan' },
  { key: 'name', header: 'Nama Alat' },
  { key: 'brand', header: 'Merek' },
  { key: 'serial_number', header: 'No. Seri' },
  { key: 'identity_no', header: 'No. Identitas' },
  { key: 'range', header: 'Kapasitas' }
];

export default function EquipmentList() {
  return (
    <CrudPage
      resource="equipment"
      title="Alat Pelanggan"
      entityLabel="Alat"
      columns={columns}
      FormComponent={EquipmentForm}
      getItemName={(row) => row.name}
    />
  );
}
