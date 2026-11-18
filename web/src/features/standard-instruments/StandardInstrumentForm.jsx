import { z } from 'zod';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import ModalForm from 'components/form/ModalForm';
import { SelectField, TextField } from 'components/form/Fields';
import { toFormValues, useZodForm } from 'lib/useZodForm';
import { optionalDate, optionalText, requiredText } from 'lib/zodFields';

export const STATUS_OPTIONS = [
  { value: 'aktif', label: 'Aktif' },
  { value: 'tidak aktif', label: 'Tidak aktif' }
];

const schema = z.object({
  name: requiredText(150),
  brand: requiredText(100),
  model: optionalText(100),
  serial_number: requiredText(100),
  status: z.enum(['aktif', 'tidak aktif']),
  last_calibrated_at: optionalDate,
  due_date: optionalDate
});

const EMPTY = { name: '', brand: '', model: '', serial_number: '', status: 'aktif', last_calibrated_at: '', due_date: '' };

export default function StandardInstrumentForm({ initialData, onSubmit, onCancel }) {
  const form = useZodForm({ schema, defaultValues: toFormValues(initialData, EMPTY), onSubmit });

  return (
    <ModalForm onSubmit={form.submit} onCancel={onCancel} error={form.formError} submitting={form.formState.isSubmitting}>
      <TextField form={form} name="name" label="Nama Alat" />
      <Row>
        <Col sm={6}>
          <TextField form={form} name="brand" label="Merk" />
        </Col>
        <Col sm={6}>
          <TextField form={form} name="model" label="Model / Tipe" />
        </Col>
      </Row>
      <TextField form={form} name="serial_number" label="Nomor Seri" />
      <SelectField form={form} name="status" label="Status" options={STATUS_OPTIONS} />
      <Row>
        <Col sm={6}>
          <TextField form={form} name="last_calibrated_at" label="Tanggal Kalibrasi Terakhir" type="date" />
        </Col>
        <Col sm={6}>
          <TextField form={form} name="due_date" label="Jatuh Tempo Kalibrasi" type="date" />
        </Col>
      </Row>
    </ModalForm>
  );
}
