import { z } from 'zod';
import Form from 'react-bootstrap/Form';

import ModalForm from 'components/form/ModalForm';
import { SelectField, TextField } from 'components/form/Fields';
import { ALL_ROLES, ROLES } from 'config/permissions';
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

  return z
    .object({
      username: z
        .string()
        .trim()
        .min(3, 'Minimal 3 karakter')
        .max(50)
        .regex(/^[a-zA-Z0-9._-]+$/, 'Hanya huruf, angka, titik, garis bawah, dan strip'),
      full_name: requiredText(100),
      email,
      role: z.enum(ALL_ROLES, { message: 'Pilih role' }),
      customer_id: z.number().int().positive().nullable(),
      is_active: z.boolean(),
      password
    })
    .refine((value) => value.role !== ROLES.CUSTOMER || value.customer_id, { path: ['customer_id'], message: 'Pilih pelanggan' });
}

const EMPTY = { username: '', full_name: '', email: '', role: ROLES.TEKNISI, customer_id: null, is_active: true, password: '' };
const roleOptions = ALL_ROLES.map((role) => ({ value: role, label: role }));
const toCustomerId = (value) => (value === '' || value === null || value === undefined ? null : Number(value));

export default function UserForm({ initialData, mode, onSubmit, onCancel }) {
  const form = useZodForm({
    schema: userSchema(mode),
    defaultValues: { ...toFormValues(initialData, EMPTY), password: '' },
    onSubmit: ({ customer_id, ...values }) => onSubmit({ ...values, customer_id: values.role === ROLES.CUSTOMER ? customer_id : null })
  });

  const isCustomer = form.watch('role') === ROLES.CUSTOMER;
  const { rows: customers } = useList('customers', { limit: 100 }, { enabled: isCustomer });

  return (
    <ModalForm onSubmit={form.submit} onCancel={onCancel} error={form.formError} submitting={form.formState.isSubmitting}>
      <TextField form={form} name="username" label="Username" disabled={mode === 'edit'} autoComplete="off" />
      <TextField form={form} name="full_name" label="Nama Lengkap" />
      <TextField form={form} name="email" label="Email" type="email" />
      <SelectField form={form} name="role" label="Role" options={roleOptions} />
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
