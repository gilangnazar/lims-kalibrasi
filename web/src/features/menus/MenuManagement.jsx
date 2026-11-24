import { useState } from 'react';
import useSWR from 'swr';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Spinner from 'react-bootstrap/Spinner';
import Table from 'react-bootstrap/Table';

import MainCard from 'components/MainCard';
import { can } from 'config/permissions';
import { useAuth } from 'hooks/useAuth';
import { api } from 'lib/api';

/** One menu row: label (saved on demand), move up/down within its siblings, visible switch. */
function MenuRow({ menu, siblings, index, editable, indent, onChange }) {
  const [label, setLabel] = useState(menu.label);
  const dirty = label.trim() !== menu.label;

  // Moving renumbers the siblings 10, 20, 30… in their new order (only changed rows are saved).
  const move = (offset) => {
    const order = [...siblings];
    [order[index], order[index + offset]] = [order[index + offset], order[index]];
    onChange(
      order.map((item, i) => [item.id, { sort_order: (i + 1) * 10 }, item.sort_order]).filter(([, body, old]) => body.sort_order !== old)
    );
  };

  return (
    <tr className={indent ? undefined : 'table-light'}>
      <td className={indent ? 'ps-4' : 'fw-semibold'}>
        <div className="d-flex gap-2 align-items-center">
          <Form.Control
            size="sm"
            value={label}
            maxLength={100}
            disabled={!editable}
            aria-label={`Label ${menu.default_label ?? menu.code}`}
            onChange={(e) => setLabel(e.target.value)}
            style={{ maxWidth: 280 }}
          />
          {dirty && (
            <Button size="sm" disabled={!label.trim()} onClick={() => onChange([[menu.id, { label: label.trim() }]])}>
              Simpan
            </Button>
          )}
        </div>
        {menu.default_label && menu.default_label !== menu.label && <small className="text-muted">Bawaan: {menu.default_label}</small>}
      </td>
      <td className="text-muted">{menu.path ?? '—'}</td>
      <td className="text-center text-nowrap">
        <Button size="sm" variant="light" aria-label="Naikkan" disabled={!editable || index === 0} onClick={() => move(-1)}>
          <i className="ph ph-arrow-up" />
        </Button>{' '}
        <Button
          size="sm"
          variant="light"
          aria-label="Turunkan"
          disabled={!editable || index === siblings.length - 1}
          onClick={() => move(1)}
        >
          <i className="ph ph-arrow-down" />
        </Button>
      </td>
      <td className="text-center">
        <Form.Check
          type="switch"
          className="d-inline-block"
          aria-label={`Tampilkan ${menu.label}`}
          checked={menu.is_visible}
          disabled={!editable || !menu.can_hide}
          onChange={(e) => onChange([[menu.id, { is_visible: e.target.checked }]])}
        />
      </td>
    </tr>
  );
}

// Menu management: rename, reorder and hide menus. Structure and actions come from the API registry.
export default function MenuManagement() {
  const { user, refreshUser } = useAuth();
  const editable = can(user, 'menus', 'edit');
  const { data: tree, error, isLoading, mutate } = useSWR('/menus', (path) => api.get(path).then((res) => res.data));
  const [state, setState] = useState({ busy: false, error: '' });

  const apply = async (changes) => {
    setState({ busy: true, error: '' });
    try {
      for (const [id, body] of changes) await api.put(`/menus/${id}`, body);
      await mutate();
      await refreshUser(); // sidebar follows the new labels / order / visibility
      setState({ busy: false, error: '' });
    } catch (err) {
      setState({ busy: false, error: err.message });
    }
  };

  return (
    <MainCard title="Manajemen Menu" secondary={state.busy && <Spinner animation="border" size="sm" />}>
      <p className="text-muted">
        Ubah nama, urutan, dan tampil/sembunyi menu. Menu yang disembunyikan tidak muncul di sidebar siapa pun; hak akses tetap diatur di
        Role & Hak Akses.
      </p>
      {(error || state.error) && <Alert variant="danger">{error?.message ?? state.error}</Alert>}
      {isLoading && <Spinner animation="border" size="sm" />}
      {tree && (
        <Table responsive size="sm" className="align-middle">
          <thead>
            <tr>
              <th>Menu</th>
              <th>Path</th>
              <th className="text-center">Urutan</th>
              <th className="text-center">Tampil</th>
            </tr>
          </thead>
          <tbody>
            {tree.map((group, groupIndex) => [
              <MenuRow
                key={`${group.id}-${group.label}`}
                menu={group}
                siblings={tree}
                index={groupIndex}
                editable={editable && !state.busy}
                onChange={apply}
              />,
              ...group.children.map((child, childIndex) => (
                <MenuRow
                  key={`${child.id}-${child.label}`}
                  menu={child}
                  siblings={group.children}
                  index={childIndex}
                  editable={editable && !state.busy}
                  indent
                  onChange={apply}
                />
              ))
            ])}
          </tbody>
        </Table>
      )}
    </MainCard>
  );
}
