import { useMemo, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Table from 'react-bootstrap/Table';

import { ACTION_LABELS, ACTIONS } from 'config/permissions';

const toState = (menus) => Object.fromEntries(menus.map((menu) => [menu.code, new Set(menu.granted)]));

/**
 * Menu × action grid for one role. `data` is GET /roles/:id/permissions
 * ({ role, locked, groups, menus: [{ code, group, label, actions, granted }] }).
 * Cells a menu doesn't allow are disabled; rows and columns have "all" toggles.
 * onSave({ [menuCode]: [actions] }) is called with the whole grid.
 */
export default function PermissionGrid({ data, editable, onSave, saving, error }) {
  const [granted, setGranted] = useState(() => toState(data.menus));
  const readOnly = !editable || data.locked;

  const rowsByGroup = useMemo(
    () => data.groups.map((group) => ({ ...group, menus: data.menus.filter((menu) => menu.group === group.code) })),
    [data]
  );

  const update = (fn) =>
    setGranted((current) => {
      const next = Object.fromEntries(Object.entries(current).map(([code, set]) => [code, new Set(set)]));
      fn(next);
      return next;
    });

  const toggleCell = (menu, action) =>
    update((next) => (next[menu.code].has(action) ? next[menu.code].delete(action) : next[menu.code].add(action)));

  const rowFull = (menu) => menu.actions.every((action) => granted[menu.code].has(action));
  const toggleRow = (menu) => {
    const full = rowFull(menu);
    update((next) => {
      next[menu.code] = new Set(full ? [] : menu.actions);
    });
  };

  const columnMenus = (action) => data.menus.filter((menu) => menu.actions.includes(action));
  const columnFull = (action) => columnMenus(action).every((menu) => granted[menu.code].has(action));
  const toggleColumn = (action) => {
    const full = columnFull(action);
    update((next) => {
      for (const menu of columnMenus(action)) full ? next[menu.code].delete(action) : next[menu.code].add(action);
    });
  };

  const submit = () => onSave(Object.fromEntries(Object.entries(granted).map(([code, set]) => [code, [...set]])));

  return (
    <>
      {data.locked && (
        <Alert variant="info" className="mb-3">
          Role Admin selalu memiliki semua hak akses dan tidak dapat diubah.
        </Alert>
      )}
      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}
      <Table responsive size="sm" className="align-middle mb-3">
        <thead>
          <tr>
            <th style={{ width: 40 }} />
            <th>Menu</th>
            {ACTIONS.map((action) => (
              <th key={action} className="text-center text-nowrap">
                <div>{ACTION_LABELS[action]}</div>
                <Form.Check
                  className="d-inline-block"
                  aria-label={`Semua ${ACTION_LABELS[action]}`}
                  checked={columnMenus(action).length > 0 && columnFull(action)}
                  disabled={readOnly || columnMenus(action).length === 0}
                  onChange={() => toggleColumn(action)}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowsByGroup.map((group) => [
            <tr key={group.code} className="table-light">
              <td />
              <td colSpan={ACTIONS.length + 1} className="fw-semibold">
                {group.label}
              </td>
            </tr>,
            ...group.menus.map((menu) => (
              <tr key={menu.code}>
                <td>
                  <Form.Check
                    aria-label={`Semua ${menu.label}`}
                    checked={rowFull(menu)}
                    disabled={readOnly}
                    onChange={() => toggleRow(menu)}
                  />
                </td>
                <td className="ps-4">{menu.label}</td>
                {ACTIONS.map((action) => (
                  <td key={action} className="text-center">
                    <Form.Check
                      className="d-inline-block"
                      aria-label={`${menu.label} ${ACTION_LABELS[action]}`}
                      checked={granted[menu.code].has(action)}
                      disabled={readOnly || !menu.actions.includes(action)}
                      onChange={() => toggleCell(menu, action)}
                    />
                  </td>
                ))}
              </tr>
            ))
          ])}
        </tbody>
      </Table>
      {!readOnly && (
        <div className="text-end">
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Hak Akses'}
          </Button>
        </div>
      )}
    </>
  );
}
