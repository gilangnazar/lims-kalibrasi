import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ContractReviewForm from './ContractReviewForm';

const items = [
  { id: 1, item_no: 1, instrument_name: 'Oven', method_name: 'Suhu', location: 'in_lab' },
  { id: 2, item_no: 2, instrument_name: 'Inkubator', method_name: 'Suhu', location: 'on_site' }
];

describe('ContractReviewForm', () => {
  it('sends V/X per item, the decision and the note', async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    const user = userEvent.setup();
    render(<ContractReviewForm items={items} onSubmit={onSubmit} />);

    await user.click(screen.getByLabelText('Metode alat 2')); // X on method for item 2
    await user.type(screen.getByLabelText('Catatan'), 'Metode alat 2 belum ada');
    await user.click(screen.getByRole('button', { name: 'Pekerjaan Dilanjutkan' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({
      decision: 'accepted',
      notes: 'Metode alat 2 belum ada',
      checklist: [
        { order_item_id: 1, scope_ok: true, method_ok: true, standards_ok: true },
        { order_item_id: 2, scope_ok: true, method_ok: false, standards_ok: true }
      ]
    });
  });

  it('shows an API error', async () => {
    const user = userEvent.setup();
    render(<ContractReviewForm items={items} onSubmit={vi.fn().mockRejectedValue(new Error('Gagal'))} />);
    await user.click(screen.getByRole('button', { name: 'Pekerjaan Ditolak' }));
    expect(await screen.findByText('Gagal')).toBeInTheDocument();
  });
});
