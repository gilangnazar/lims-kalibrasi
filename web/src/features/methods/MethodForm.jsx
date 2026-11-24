import { useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

import ModalForm from 'components/form/ModalForm';
import { getError, TextField } from 'components/form/Fields';
import { toFormValues, useZodForm } from 'lib/useZodForm';
import { optionalText, requiredText } from 'lib/zodFields';

// Comma/line-separated text ↔ list (extra request fields, certificate remarks).
const toList = (value) =>
  (value ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const schema = z.object({
  code: optionalText(30),
  name: requiredText(150),
  description: optionalText(2000),
  // Each parameter becomes a field on the calibration worksheet (roadmap P2).
  parameter_schema: z
    .array(z.object({ name: requiredText(100), unit: z.string().trim().max(30) }))
    .min(1, 'Minimal satu parameter')
    .max(50),
  template_key: z
    .string()
    .trim()
    .max(50)
    .regex(/^[a-z0-9_]*$/, 'Hanya huruf kecil, angka, garis bawah')
    .transform((value) => value || null),
  reference: optionalText(2000),
  uncertainty_reference: optionalText(2000),
  remarks_text: z.string().max(5000),
  extra_spec_text: z.string().max(1000),
  is_accredited: z.boolean()
});

const EMPTY = {
  code: '',
  name: '',
  description: '',
  parameter_schema: [{ name: '', unit: '' }],
  template_key: '',
  reference: '',
  uncertainty_reference: '',
  remarks_text: '',
  extra_spec_text: '',
  is_accredited: false
};

export default function MethodForm({ initialData, onSubmit, onCancel }) {
  const form = useZodForm({
    schema,
    defaultValues: {
      ...toFormValues(initialData, EMPTY),
      remarks_text: (initialData?.remarks ?? []).join('\n'),
      extra_spec_text: (initialData?.extra_spec_fields ?? []).join('\n')
    },
    onSubmit: ({ remarks_text: remarks, extra_spec_text: extra, ...values }) =>
      onSubmit({ ...values, remarks: toList(remarks), extra_spec_fields: toList(extra) })
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'parameter_schema' });
  const { errors } = form.formState;
  const listError = errors.parameter_schema?.message ?? errors.parameter_schema?.root?.message;

  return (
    <ModalForm onSubmit={form.submit} onCancel={onCancel} error={form.formError} submitting={form.formState.isSubmitting}>
      <TextField form={form} name="code" label="Kode Metode" placeholder="mis. LKAL-IK/01.01/25" />
      <TextField form={form} name="name" label="Nama Metode" />
      <TextField form={form} name="description" label="Deskripsi" as="textarea" rows={2} />
      <TextField form={form} name="template_key" label="Template hasil (kode)" placeholder="mis. oven" />
      <TextField
        form={form}
        name="extra_spec_text"
        label="Field tambahan pada permintaan (satu per baris)"
        as="textarea"
        rows={2}
        placeholder="mis. Volume"
      />
      <TextField form={form} name="reference" label="Acuan Metode" as="textarea" rows={2} />
      <TextField form={form} name="uncertainty_reference" label="Acuan Ketidakpastian" as="textarea" rows={2} />
      <TextField form={form} name="remarks_text" label="Keterangan pada sertifikat (satu per baris)" as="textarea" rows={3} />
      <Form.Check
        type="switch"
        id="field-is_accredited"
        className="mb-3"
        label="Metode terakreditasi KAN"
        {...form.register('is_accredited')}
      />

      <Form.Label>Parameter</Form.Label>
      {fields.map((field, index) => (
        <div key={field.id} className="d-flex gap-2 mb-2 align-items-start">
          <div className="flex-grow-1">
            <Form.Control
              placeholder="Nama parameter"
              aria-label={`Nama parameter ${index + 1}`}
              isInvalid={Boolean(getError(errors, `parameter_schema.${index}.name`))}
              {...form.register(`parameter_schema.${index}.name`)}
            />
            <Form.Control.Feedback type="invalid">{getError(errors, `parameter_schema.${index}.name`)}</Form.Control.Feedback>
          </div>
          <Form.Control
            style={{ maxWidth: 120 }}
            placeholder="Satuan"
            aria-label={`Satuan parameter ${index + 1}`}
            {...form.register(`parameter_schema.${index}.unit`)}
          />
          <Button variant="outline-danger" onClick={() => remove(index)} aria-label={`Hapus parameter ${index + 1}`}>
            <i className="ph ph-trash" />
          </Button>
        </div>
      ))}
      {listError && <div className="text-danger small mb-2">{listError}</div>}
      <Button variant="light-primary" size="sm" onClick={() => append({ name: '', unit: '' })}>
        + Tambah parameter
      </Button>
    </ModalForm>
  );
}
