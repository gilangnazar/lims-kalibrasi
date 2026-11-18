import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

/**
 * react-hook-form + zod, plus API error handling: field errors from the API's `details`
 * are shown on the matching inputs, and the message is exposed as `formError`.
 */
export function useZodForm({ schema, defaultValues, onSubmit }) {
  const form = useForm({ resolver: zodResolver(schema), defaultValues });
  const [formError, setFormError] = useState('');

  const submit = form.handleSubmit(async (values) => {
    setFormError('');
    try {
      await onSubmit(values);
    } catch (err) {
      for (const detail of err.details ?? []) {
        if (detail.field) form.setError(detail.field, { message: detail.message });
      }
      setFormError(err.message || 'Terjadi kesalahan');
    }
  });

  return { ...form, submit, formError };
}

/** Builds form defaults from an API row: nulls become '' so inputs stay controlled. */
export function toFormValues(row, defaults) {
  const values = {};
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = row?.[key];
    values[key] = value === null || value === undefined ? fallback : value;
  }
  return values;
}
