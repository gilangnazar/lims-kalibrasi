import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { api } from 'lib/api';
import OrderRequestForm from './OrderRequestForm';

const DATA = {
  customers: [{ id: 3, code: 'CUST-0003', company_name: 'PT Contoh', address: 'Jl. Contoh 1' }],
  methods: [
    { id: 7, code: 'LKAL-IK/01.01/25', name: 'Suhu Enklosur', extra_spec_fields: ['Volume'] },
    { id: 8, code: 'MK-TIMB-01', name: 'Timbangan', extra_spec_fields: [] }
  ],
  equipment: [
    { id: 11, name: 'Oven', brand: 'Memmert', serial_number: 'SN-1', identity_no: 'ID-1', range: '(30 - 300) °C', resolution: '0,1 °C' }
  ]
};

vi.mock('lib/useResource', () => ({
  useList: (resource, _params, options) => ({ rows: options?.enabled === false ? [] : DATA[resource], meta: {}, isLoading: false })
}));

const renderForm = (onCreated) =>
  render(
    <MemoryRouter>
      <OrderRequestForm onCreated={onCreated} />
    </MemoryRouter>
  );

describe('OrderRequestForm', () => {
  afterEach(() => vi.restoreAllMocks());

  it('copies a registry instrument, shows the method extra field and sends qty + extra specs', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 42 } });
    const onCreated = vi.fn();
    const user = userEvent.setup();
    renderForm(onCreated);

    await user.selectOptions(screen.getByLabelText('Pelanggan'), '3');
    await user.selectOptions(screen.getByLabelText('Dari daftar alat pelanggan'), '11');
    expect(screen.getByLabelText('Nama Alat')).toHaveValue('Oven');

    expect(screen.queryByLabelText('Volume')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Metode'), '7');
    await user.type(screen.getByLabelText('Volume'), '<1m3');
    await user.clear(screen.getByLabelText('Jumlah'));
    await user.type(screen.getByLabelText('Jumlah'), '2');
    await user.click(screen.getByRole('button', { name: 'Simpan Permintaan' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ id: 42 }));
    const body = post.mock.calls[0][1];
    expect(post.mock.calls[0][0]).toBe('/orders');
    expect(body).toMatchObject({ customer_id: 3, apply_ppn: true, other_costs: [] });
    expect(body.certificate_name).toBeUndefined(); // blank → the customer's name (API default)
    expect(body.items[0]).toMatchObject({
      equipment_id: 11,
      method_id: 7,
      qty: 2,
      instrument_name: 'Oven',
      serial_number: 'SN-1',
      extra_specs: { Volume: '<1m3' },
      location: 'in_lab'
    });
  });

  it('requires a customer, a method and an instrument name', async () => {
    const post = vi.spyOn(api, 'post');
    const user = userEvent.setup();
    renderForm(vi.fn());
    await user.click(screen.getByRole('button', { name: 'Simpan Permintaan' }));
    expect(await screen.findByText('Pilih pelanggan')).toBeInTheDocument();
    expect(screen.getByText('Pilih metode')).toBeInTheDocument();
    expect(screen.getByText('Wajib diisi')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });
});
