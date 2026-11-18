import { useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

import ModalForm from 'components/form/ModalForm';
import { getError, TextField } from 'components/form/Fields';
import { toFormValues, useZodForm } from 'lib/useZodForm';
import { optionalText, requiredText } from 'lib/zodFields';

const schema = z.object({
  code: optionalText(30),
  name: requiredText(150),
  description: optionalText(2000),
  // Each parameter becomes a field on the calibration worksheet (roadmap P2).
  parameter_schema: z
    .array(z.object({ name: requiredText(100), unit: z.string().trim().max(30) }))
    .min(1, 'Minimal satu parameter')
    .max(50)
});

const EMPTY = { code: '', name: '', description: '', parameter_schema: [{ name: '', unit: '' }] };

export default function MethodForm({ initialData, onSubmit, onCancel }) {
  const form = useZodForm({ schema, defaultValues: toFormValues(initialData, EMPTY), onSubmit });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'parameter_schema' });
  const { errors } = form.formState;
  const listError = errors.parameter_schema?.message ?? errors.parameter_schema?.root?.message;

  return (
    <ModalForm onSubmit={form.submit} onCancel={onCancel} error={form.formError} submitting={form.formState.isSubmitting}>
      <TextField form={form} name="code" label="Kode Metode" placeholder="mis. MK-TIMB-01" />
      <TextField form={form} name="name" label="Nama Metode" />
      <TextField form={form} name="description" label="Deskripsi" as="textarea" rows={2} />

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
