import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import UserForm from './UserForm';

const ROLES = [
  { id: 1, name: 'Admin', is_customer_scope: false },
  { id: 5, name: 'Teknisi', is_customer_scope: false },
  { id: 6, name: 'Customer', is_customer_scope: true }
];

vi.mock('lib/useResource', () => ({
  useList: (resource) => ({
    rows: resource === 'roles' ? ROLES : [{ id: 9, code: 'CUST-0009', company_name: 'PT Contoh' }],
    meta: {},
    isLoading: false
  })
}));

async function fillBasics(user) {
  await user.type(screen.getByLabelText('Username'), 'budi');
  await user.type(screen.getByLabelText('Nama Lengkap'), 'Budi');
  await user.type(screen.getByLabelText('Email'), 'budi@lab.id');
  await user.type(screen.getByLabelText('Password'), 'password123');
}

describe('UserForm', () => {
  it('submits several roles as role_ids', async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    const user = userEvent.setup();
    render(<UserForm mode="create" onSubmit={onSubmit} onCancel={() => {}} />);

    await fillBasics(user);
    await user.click(screen.getByLabelText('Admin'));
    await user.click(screen.getByLabelText('Teknisi'));
    await user.click(screen.getByRole('button', { name: 'Simpan' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ username: 'budi', role_ids: [1, 5], customer_id: null });
  });

  it('requires at least one role', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<UserForm mode="create" onSubmit={onSubmit} onCancel={() => {}} />);

    await fillBasics(user);
    await user.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Pilih minimal satu role')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('asks for a customer with a customer role, and refuses mixing it with staff roles', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<UserForm mode="create" onSubmit={onSubmit} onCancel={() => {}} />);

    await fillBasics(user);
    await user.click(screen.getByLabelText('Customer'));
    expect(screen.getByLabelText('Pelanggan')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(await screen.findByText('Pilih pelanggan')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Teknisi'));
    await user.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(await screen.findByText('Role pelanggan tidak dapat digabung dengan role staf')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
