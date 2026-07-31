import { z } from 'zod';

const envelope = (body) => z.object({
  body,
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
  .regex(/[a-z]/, 'Password must contain a lowercase letter.')
  .regex(/\d/, 'Password must contain a number.')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character.');

export const updateUserSchema = envelope(
  z.object({
    displayName: z.string().trim().min(2).max(80).optional(),
    username: z
      .union([
        z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).transform((value) => value.toLowerCase()),
        z.null(),
      ])
      .optional(),
    phone: z.string().trim().max(30).optional(),
    location: z.string().trim().max(120).optional(),
    bio: z.string().trim().max(240).optional(),
  }).strict().refine((body) => Object.keys(body).length > 0, 'Provide at least one profile field.'),
);

export const changePasswordSchema = envelope(
  z.object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: strongPassword,
  }).strict().refine(
    (body) => body.currentPassword !== body.newPassword,
    { path: ['newPassword'], message: 'New password must be different from the current password.' },
  ),
);
