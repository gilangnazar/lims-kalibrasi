import CrudPage from 'components/crud/CrudPage';
import CustomerForm from './CustomerForm';

const columns = [
  { key: 'code', header: 'Kode' },
  { key: 'company_name', header: 'Nama Perusahaan' },
  { key: 'pic_name', header: 'PIC' },
  { key: 'email', header: 'Email' },
  { key: 'phone', header: 'Telepon' },
  { key: 'address', header: 'Alamat' }
];

export default function CustomerList() {
  return (
    <CrudPage
      resource="customers"
      title="Pelanggan"
      entityLabel="Pelanggan"
      columns={columns}
      FormComponent={CustomerForm}
      getItemName={(row) => row.company_name}
    />
  );
}
