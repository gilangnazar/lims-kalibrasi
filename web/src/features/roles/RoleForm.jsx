import { z } from 'zod';
import Form from 'react-bootstrap/Form';

import ModalForm from 'components/form/ModalForm';
import { TextField } from 'components/form/Fields';
import { toFormValues, useZodForm } from 'lib/useZodForm';
import { optionalText, requiredText } from 'lib/zodFields';

export const roleSchema = z.object({
  name: requiredText(50),
  description: optionalText(255),
  is_customer_scope: z.boolean()
});

const EMPTY = { name: '', description: '', is_customer_scope: false };

// System roles keep their name and type; a role's type can't change while users hold it.
export default function RoleForm({ initialData, mode, onSubmit, onCancel }) {
  const form = useZodForm({ schema: roleSchema, defaultValues: toFormValues(initialData, EMPTY), onSubmit });
  const isSystem = Boolean(initialData?.is_system);
  const typeLocked = isSystem || (mode === 'edit' && initialData?.user_count > 0);

  return (
    <ModalForm onSubmit={form.submit} onCancel={onCancel} error={form.formError} submitting={form.formState.isSubmitting}>
      <TextField form={form} name="name" label="Nama Role" disabled={isSystem} />
      <TextField form={form} name="description" label="Deskripsi" as="textarea" rows={2} />
      <Form.Check
        type="switch"
        id="field-is_customer_scope"
        label="Role pelanggan (portal) — hanya melihat data perusahaannya sendiri"
        disabled={typeLocked}
        {...form.register('is_customer_scope')}
      />
      {isSystem && <Form.Text className="text-muted">Role sistem: nama dan jenis tidak dapat diubah.</Form.Text>}
    </ModalForm>
  );
}
