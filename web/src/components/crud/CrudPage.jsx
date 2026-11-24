import { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

import MainCard from 'components/MainCard';
import ConfirmDialog from 'components/modal/ConfirmDialog';
import FormModal from 'components/modal/FormModal';
import DataTable from 'components/crud/DataTable';
import { can } from 'config/permissions';
import { useAuth } from 'hooks/useAuth';
import { useDebounced } from 'lib/useDebounced';
import { useList, useResourceMutations } from 'lib/useResource';

const PAGE_SIZE = 20;

/**
 * List + search + pagination + create/edit modal + delete confirm for one API resource.
 * `resource` is the API path (/api/<resource>); `menu` the permission menu code (defaults to resource):
 * buttons follow add / edit / delete on that menu. FormComponent receives { initialData, mode, onSubmit(values), onCancel }.
 * Optional: `rowActions(row)` renders extra buttons before Edit/Hapus; `canDeleteRow(row)` hides Hapus per row.
 */
export default function CrudPage({
  resource,
  menu = resource,
  title,
  entityLabel,
  columns,
  FormComponent,
  getItemName,
  modalSize,
  rowActions,
  canDeleteRow = () => true
}) {
  const { user } = useAuth();
  const canAdd = can(user, menu, 'add');
  const canEdit = can(user, menu, 'edit');
  const canDelete = can(user, menu, 'delete');

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounced(searchInput.trim());
  useEffect(() => setPage(1), [search]);

  const { rows, meta, error, isLoading } = useList(resource, { page, limit: PAGE_SIZE, search });
  const { create, update, remove } = useResourceMutations(resource);

  const [editing, setEditing] = useState(null); // null = closed, {} = create, row = edit
  const [deleting, setDeleting] = useState(null);
  const [deleteState, setDeleteState] = useState({ busy: false, error: '' });

  const mode = editing?.id ? 'edit' : 'create';
  const closeForm = () => setEditing(null);

  const handleSubmit = async (values) => {
    if (mode === 'edit') await update(editing.id, values);
    else await create(values);
    closeForm();
  };

  const confirmDelete = async () => {
    setDeleteState({ busy: true, error: '' });
    try {
      await remove(deleting.id);
      setDeleting(null);
      setDeleteState({ busy: false, error: '' });
    } catch (err) {
      setDeleteState({ busy: false, error: err.message });
    }
  };

  const toolbar = (
    <div className="d-flex gap-2">
      <Form.Control
        size="sm"
        type="search"
        placeholder="Cari..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        aria-label={`Cari ${entityLabel}`}
        style={{ minWidth: 200 }}
      />
      {canAdd && (
        <Button size="sm" variant="light-primary" className="d-inline-flex text-nowrap" onClick={() => setEditing({})}>
          <i className="ph ph-plus-square me-1 align-self-center" />
          Tambah
        </Button>
      )}
    </div>
  );

  const actions =
    canEdit || canDelete || rowActions
      ? (row) => (
          <>
            {rowActions?.(row)}
            {canEdit && (
              <Button variant="warning" size="sm" className="ms-2" onClick={() => setEditing(row)}>
                Edit
              </Button>
            )}
            {canDelete && canDeleteRow(row) && (
              <Button variant="danger" size="sm" className="ms-2" onClick={() => setDeleting(row)}>
                Hapus
              </Button>
            )}
          </>
        )
      : undefined;

  return (
    <>
      <MainCard className="table-card" title={title} secondary={toolbar}>
        <DataTable
          columns={columns}
          rows={rows}
          meta={meta}
          isLoading={isLoading}
          error={error}
          emptyText={search ? 'Tidak ada data yang cocok' : `Belum ada data ${entityLabel.toLowerCase()}`}
          actions={actions}
          onPageChange={setPage}
        />
      </MainCard>

      <FormModal
        show={editing !== null}
        onHide={closeForm}
        title={`${mode === 'edit' ? 'Edit' : 'Tambah'} ${entityLabel}`}
        size={modalSize}
      >
        <FormComponent initialData={mode === 'edit' ? editing : null} mode={mode} onSubmit={handleSubmit} onCancel={closeForm} />
      </FormModal>

      <ConfirmDialog
        show={deleting !== null}
        message={
          <>
            Yakin ingin menghapus <strong>{deleting && getItemName(deleting)}</strong>?
          </>
        }
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleting(null);
          setDeleteState({ busy: false, error: '' });
        }}
        busy={deleteState.busy}
        error={deleteState.error}
      />
    </>
  );
}
