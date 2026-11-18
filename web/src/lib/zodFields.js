import { z } from 'zod';

// Reusable zod field builders with Indonesian messages, shared by every feature form.
export const requiredText = (max = 255) => z.string().trim().min(1, 'Wajib diisi').max(max, `Maksimal ${max} karakter`);

/** Optional text input: '' is sent to the API as null. */
export const optionalText = (max = 255) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter`)
    .transform((value) => value || null);

/** Optional <input type="date">: '' → null, otherwise YYYY-MM-DD. */
export const optionalDate = z
  .string()
  .transform((value) => value || null)
  .pipe(z.iso.date('Tanggal tidak valid').nullable());

export const email = z.email('Email tidak valid').max(150);

export const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{6,30}$/, 'Nomor telepon tidak valid');
