import { useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';

import CrudPage from 'components/crud/CrudPage';
import PermissionModal from './PermissionModal';
import RoleForm from './RoleForm';

const columns = [
  { key: 'name', header: 'Nama Role' },
  { key: 'description', header: 'Deskripsi' },
  {
    key: 'is_system',
    header: 'Jenis',
    render: (row) => (
      <>
        <Badge bg={row.is_system ? 'secondary' : 'primary'}>{row.is_system ? 'Sistem' : 'Kustom'}</Badge>
        {row.is_customer_scope && (
          <Badge bg="info" className="ms-1">
            Pelanggan
          </Badge>
        )}
      </>
    )
  },
  { key: 'user_count', header: 'Jumlah User' }
];

export default function RoleList() {
  const [permissionRole, setPermissionRole] = useState(null);

  return (
    <>
      <CrudPage
        resource="roles"
        title="Role & Hak Akses"
        entityLabel="Role"
        columns={columns}
        FormComponent={RoleForm}
        getItemName={(row) => row.name}
        canDeleteRow={(row) => !row.is_system}
        rowActions={(row) => (
          <Button variant="light-primary" size="sm" onClick={() => setPermissionRole(row)}>
            <i className="ph ph-shield-check me-1" />
            Hak Akses
          </Button>
        )}
      />
      <PermissionModal role={permissionRole} onHide={() => setPermissionRole(null)} />
    </>
  );
}
