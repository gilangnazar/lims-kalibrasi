import CrudPage from 'components/crud/CrudPage';
import StatusBadge from 'components/StatusBadge';
import UserForm from './UserForm';

const columns = [
  { key: 'username', header: 'Username' },
  { key: 'full_name', header: 'Nama Lengkap' },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role' },
  { key: 'is_active', header: 'Status', render: (row) => <StatusBadge active={row.is_active} /> }
];

export default function UserList() {
  return (
    <CrudPage
      resource="users"
      title="Pengguna"
      entityLabel="Pengguna"
      columns={columns}
      FormComponent={UserForm}
      getItemName={(row) => row.username}
    />
  );
}
