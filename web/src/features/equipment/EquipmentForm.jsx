import { z } from 'zod';

import ModalForm from 'components/form/ModalForm';
import { SelectField, TextField } from 'components/form/Fields';
import { useList } from 'lib/useResource';
import { toFormValues, useZodForm } from 'lib/useZodForm';
import { optionalText, requiredText } from 'lib/zodFields';

export const equipmentSchema = z.object({
  customer_id: z.number({ message: 'Pilih pelanggan' }).int().positive('Pilih pelanggan'),
  name: requiredText(150),
  brand: optionalText(100),
  model: optionalText(100),
  serial_number: optionalText(100),
  identity_no: optionalText(100),
  range: optionalText(100),
  resolution: optionalText(100)
});

const EMPTY = { customer_id: '', name: '', brand: '', model: '', serial_number: '', identity_no: '', range: '', resolution: '' };
const toId = (value) => (value === '' || value === null || value === undefined ? undefined : Number(value));

// Customer equipment registry: it only pre-fills order items (items keep their own copy).
export default function EquipmentForm({ initialData, onSubmit, onCancel }) {
  const form = useZodForm({ schema: equipmentSchema, defaultValues: toFormValues(initialData, EMPTY), onSubmit });
  const { rows: customers } = useList('customers', { limit: 100, sort: 'company_name' });

  return (
    <ModalForm onSubmit={form.submit} onCancel={onCancel} error={form.formError} submitting={form.formState.isSubmitting}>
      <SelectField
        form={form}
        name="customer_id"
        label="Pelanggan"
        placeholder="— Pilih pelanggan —"
        options={customers.map((c) => ({ value: c.id, label: `${c.code} · ${c.company_name}` }))}
        setValueAs={toId}
      />
      <TextField form={form} name="name" label="Nama Alat" />
      <TextField form={form} name="brand" label="Merek" />
      <TextField form={form} name="model" label="Tipe / Model" />
      <TextField form={form} name="serial_number" label="No. Seri" />
      <TextField form={form} name="identity_no" label="No. Identitas" />
      <TextField form={form} name="range" label="Kapasitas" placeholder="mis. (30 - 300) °C" />
      <TextField form={form} name="resolution" label="Ketelitian" placeholder="mis. 0,1 °C" />
    </ModalForm>
  );
}
