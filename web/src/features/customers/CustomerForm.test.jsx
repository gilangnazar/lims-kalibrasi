import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ApiError } from 'lib/api';
import CustomerForm from './CustomerForm';

const valid = { company_name: 'PT Maju', pic_name: 'Siti', email: 'siti@maju.co.id', phone: '0812345678', address: 'Jl. Merdeka' };

async function fill(user, values) {
  const labels = { company_name: 'Nama Perusahaan', pic_name: 'Nama PIC', email: 'Email', phone: 'Nomor Telepon', address: 'Alamat' };
  for (const [key, value] of Object.entries(values)) await user.type(screen.getByLabelText(labels[key]), value);
}

describe('CustomerForm', () => {
  it('shows validation errors and does not submit invalid data', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CustomerForm onSubmit={onSubmit} onCancel={() => {}} />);

    await fill(user, { ...valid, email: 'bukan-email' });
    await user.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Email tidak valid')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits trimmed values', async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    const user = userEvent.setup();
    render(<CustomerForm onSubmit={onSubmit} onCancel={() => {}} />);

    await fill(user, { ...valid, company_name: '  PT Maju  ' });
    await user.click(screen.getByRole('button', { name: 'Simpan' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(valid));
  });

  it('shows API errors on the form', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError(409, 'Data sudah ada'));
    const user = userEvent.setup();
    render(<CustomerForm onSubmit={onSubmit} onCancel={() => {}} />);

    await fill(user, valid);
    await user.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Data sudah ada')).toBeInTheDocument();
  });
});
