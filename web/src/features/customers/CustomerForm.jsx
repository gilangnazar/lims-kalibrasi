import { z } from 'zod';

import ModalForm from 'components/form/ModalForm';
import { TextField } from 'components/form/Fields';
import { toFormValues, useZodForm } from 'lib/useZodForm';
import { email, phone, requiredText } from 'lib/zodFields';

export const customerSchema = z.object({
  company_name: requiredText(150),
  pic_name: requiredText(100),
  email,
  phone,
  address: requiredText(1000)
});

const EMPTY = { company_name: '', pic_name: '', email: '', phone: '', address: '' };

export default function CustomerForm({ initialData, onSubmit, onCancel }) {
  const form = useZodForm({ schema: customerSchema, defaultValues: toFormValues(initialData, EMPTY), onSubmit });

  return (
    <ModalForm onSubmit={form.submit} onCancel={onCancel} error={form.formError} submitting={form.formState.isSubmitting}>
      <TextField form={form} name="company_name" label="Nama Perusahaan" />
      <TextField form={form} name="pic_name" label="Nama PIC" />
      <TextField form={form} name="email" label="Email" type="email" />
      <TextField form={form} name="phone" label="Nomor Telepon" type="tel" />
      <TextField form={form} name="address" label="Alamat" as="textarea" rows={3} />
    </ModalForm>
  );
}
