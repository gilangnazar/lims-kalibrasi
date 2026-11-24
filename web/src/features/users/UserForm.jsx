import { z } from 'zod';
import { Controller } from 'react-hook-form';
import Form from 'react-bootstrap/Form';

import ModalForm from 'components/form/ModalForm';
import { SelectField, TextField } from 'components/form/Fields';
import { useList } from 'lib/useResource';
import { toFormValues, useZodForm } from 'lib/useZodForm';
import { email, requiredText } from 'lib/zodFields';

export function userSchema(mode) {
  const password =
    mode === 'create'
      ? z.string().min(8, 'Minimal 8 karakter').max(72)
      : z
          .string()
          .max(72)
          .refine((value) => value === '' || value.length >= 8, 'Minimal 8 karakter')
          .transform((value) => value || undefined); // blank = keep current password

  return z.object({
    username: z
      .string()
      .trim()
      .min(3, 'Minimal 3 karakter')
      .max(50)
      .regex(/^[a-zA-Z0-9._-]+$/, 'Hanya huruf, angka, titik, garis bawah, dan strip'),
    full_name: requiredText(100),
    email,
    role_ids: z.array(z.number().int().positive()).min(1, 'Pilih minimal satu role'),
    customer_id: z.number().int().positive().nullable(),
    is_active: z.boolean(),
    password
  });
}

const EMPTY = { username: '', full_name: '', email: '', role_ids: [], customer_id: null, is_active: true, password: '' };
const toCustomerId = (value) => (value === '' || value === null || value === undefined ? null : Number(value));

/** Role checkboxes (several roles per user). A customer (portal) role can't be combined with staff roles. */
function RoleCheckboxes({ field, roles, error }) {
  const selected = field.value ?? [];
  const toggle = (id) => field.onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);
  return (
    <Form.Group className="mb-3">
      <Form.Label>Role</Form.Label>
      <div className="d-flex flex-wrap gap-3">
        {roles.map((role) => (
          <Form.Check
            key={role.id}
            type="checkbox"
            id={`role-${role.id}`}
            label={role.name}
            checked={selected.includes(role.id)}
            onChange={() => toggle(role.id)}
            isInvalid={Boolean(error)}
          />
        ))}
      </div>
      {error && <div className="invalid-feedback d-block">{error}</div>}
    </Form.Group>
  );
}

export default function UserForm({ initialData, mode, onSubmit, onCancel }) {
  const { rows: roles } = useList('roles', { limit: 100, sort: 'name' });
  const scopedIds = roles.filter((role) => role.is_customer_scope).map((role) => role.id);

  const form = useZodForm({
    schema: userSchema(mode),
    defaultValues: {
      ...toFormValues(initialData, EMPTY),
      role_ids: (initialData?.roles ?? []).map((role) => role.id),
      password: ''
    },
    onSubmit: async ({ customer_id, ...values }) => {
      const scoped = values.role_ids.some((id) => scopedIds.includes(id));
      if (scoped && values.role_ids.length > 1) {
        form.setError('role_ids', { message: 'Role pelanggan tidak dapat digabung dengan role staf' });
        return;
      }
      if (scoped && !customer_id) {
        form.setError('customer_id', { message: 'Pilih pelanggan' });
        return;
      }
      await onSubmit({ ...values, customer_id: scoped ? customer_id : null });
    }
  });

  const isCustomer = (form.watch('role_ids') ?? []).some((id) => scopedIds.includes(id));
  const { rows: customers } = useList('customers', { limit: 100 }, { enabled: isCustomer });

  return (
    <ModalForm onSubmit={form.submit} onCancel={onCancel} error={form.formError} submitting={form.formState.isSubmitting}>
      <TextField form={form} name="username" label="Username" disabled={mode === 'edit'} autoComplete="off" />
      <TextField form={form} name="full_name" label="Nama Lengkap" />
      <TextField form={form} name="email" label="Email" type="email" />
      <Controller
        control={form.control}
        name="role_ids"
        render={({ field, fieldState }) => <RoleCheckboxes field={field} roles={roles} error={fieldState.error?.message} />}
      />
      {isCustomer && (
        <SelectField
          form={form}
          name="customer_id"
          label="Pelanggan"
          placeholder="— Pilih pelanggan —"
          options={customers.map((c) => ({ value: c.id, label: `${c.code} · ${c.company_name}` }))}
          setValueAs={toCustomerId}
        />
      )}
      <TextField
        form={form}
        name="password"
        label={mode === 'edit' ? 'Password baru (kosongkan jika tidak diubah)' : 'Password'}
        type="password"
        autoComplete="new-password"
      />
      <Form.Check type="switch" id="field-is_active" label="Akun aktif" {...form.register('is_active')} />
    </ModalForm>
  );
}
