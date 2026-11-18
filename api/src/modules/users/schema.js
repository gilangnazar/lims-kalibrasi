const { z } = require('zod');
const { ALL_ROLES } = require('../../config/roles');
const { listQuery } = require('../../lib/pagination');

const password = z.string().min(8, 'Password minimal 8 karakter').max(72);

const createUser = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username hanya boleh huruf, angka, titik, garis bawah, dan strip'),
  email: z.email('Email tidak valid').max(150),
  full_name: z.string().trim().min(1).max(100),
  role: z.enum(ALL_ROLES),
  customer_id: z.number().int().positive().nullable().optional(),
  is_active: z.boolean().default(true),
  password
});

// Username is immutable; password is optional (blank = keep current).
const updateUser = z
  .object({
    email: z.email('Email tidak valid').max(150),
    full_name: z.string().trim().min(1).max(100),
    role: z.enum(ALL_ROLES),
    customer_id: z.number().int().positive().nullable(),
    is_active: z.boolean(),
    password
  })
  .partial();

const listUsers = listQuery.extend({ role: z.enum(ALL_ROLES).optional() });

module.exports = { createUser, updateUser, listUsers, password };
