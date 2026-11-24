import { render, screen, within } from '@testing-library/react';

import ValuesDiff from './ValuesDiff';

const rowOf = (field) => screen.getByText(field).closest('tr');

describe('ValuesDiff', () => {
  it('shows old and new values per field and highlights changes', () => {
    render(<ValuesDiff oldValues={{ pic_name: 'Ani', is_active: true }} newValues={{ pic_name: 'Budi', is_active: true }} />);
    expect(within(rowOf('pic_name')).getByText('Ani')).toBeInTheDocument();
    expect(within(rowOf('pic_name')).getByText('Budi')).toBeInTheDocument();
    expect(rowOf('pic_name')).toHaveClass('table-warning');
    expect(rowOf('is_active')).not.toHaveClass('table-warning');
    expect(within(rowOf('is_active')).getAllByText('Ya')).toHaveLength(2);
  });

  it('handles a create (new values only) and objects', () => {
    render(<ValuesDiff oldValues={null} newValues={{ roles: ['Admin', 'Teknisi'], note: null }} />);
    expect(within(rowOf('roles')).getByText('["Admin","Teknisi"]')).toBeInTheDocument();
    expect(within(rowOf('note')).getByText('—')).toBeInTheDocument();
  });

  it('says so when nothing was recorded', () => {
    render(<ValuesDiff oldValues={null} newValues={null} />);
    expect(screen.getByText('Tidak ada nilai yang dicatat.')).toBeInTheDocument();
  });
});
