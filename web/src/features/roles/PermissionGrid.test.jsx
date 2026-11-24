import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import PermissionGrid from './PermissionGrid';

const data = {
  role: { id: 2, name: 'Teknisi' },
  locked: false,
  groups: [
    { code: 'master-data', label: 'Master Data' },
    { code: 'administration', label: 'Administrasi' }
  ],
  menus: [
    { code: 'customers', group: 'master-data', label: 'Pelanggan', actions: ['view', 'add', 'edit', 'delete'], granted: ['view'] },
    { code: 'menus', group: 'administration', label: 'Manajemen Menu', actions: ['view', 'edit'], granted: [] }
  ]
};

const cell = (name) => screen.getByRole('checkbox', { name });

describe('PermissionGrid', () => {
  it('disables cells a menu does not allow', () => {
    render(<PermissionGrid data={data} editable onSave={() => {}} />);
    expect(cell('Manajemen Menu Hapus')).toBeDisabled();
    expect(cell('Manajemen Menu Ubah')).toBeEnabled();
    expect(cell('Pelanggan Lihat')).toBeChecked();
  });

  it('toggles rows, columns and cells and saves the whole grid', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<PermissionGrid data={data} editable onSave={onSave} />);

    await user.click(cell('Semua Pelanggan')); // row → every action Pelanggan allows
    await user.click(cell('Semua Ubah')); // column not full yet (Manajemen Menu) → tick it everywhere
    await user.click(cell('Pelanggan Hapus')); // untick one cell
    await user.click(screen.getByRole('button', { name: 'Simpan Hak Akses' }));

    const saved = onSave.mock.calls[0][0];
    expect([...saved.customers].sort()).toEqual(['add', 'edit', 'view']);
    expect(saved.menus).toEqual(['edit']);
  });

  it('is read-only for the locked Admin role', () => {
    render(<PermissionGrid data={{ ...data, locked: true }} editable onSave={() => {}} />);
    expect(screen.getByText(/selalu memiliki semua hak akses/)).toBeInTheDocument();
    expect(cell('Pelanggan Tambah')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Simpan Hak Akses' })).not.toBeInTheDocument();
  });
});
