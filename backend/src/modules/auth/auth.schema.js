import { z } from 'zod';

const requestEnvelope = (body) =>
  z.object({
    body,
    params: z.object({}).passthrough(),
    query: z.object({}).passthrough(),
  });

const email = z
  .string({ error: 'Email is required.' })
  .trim()
  .email('Enter a valid email address.')
  .transform((value) => value.toLowerCase());

const password = z
  .string({ error: 'Password is required.' })
  .min(8, 'Password must be at least 8 characters.')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
  .regex(/[a-z]/, 'Password must contain a lowercase letter.')
  .regex(/\d/, 'Password must contain a number.')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character.');

export const registerSchema = requestEnvelope(
  z
    .object({
      email,
      username: z
        .string()
        .trim()
        .min(3, 'Username must be at least 3 characters.')
        .max(30, 'Username must be at most 30 characters.')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username may contain only letters, numbers and underscores.')
        .transform((value) => value.toLowerCase())
        .optional(),
      displayName: z
        .string({ error: 'Display name is required.' })
        .trim()
        .min(2, 'Display name must be at least 2 characters.')
        .max(80, 'Display name must be at most 80 characters.'),
      password,
    })
    .strict(),
);

export const verifyEmailSchema = requestEnvelope(
  z
    .object({
      email,
      otp: z.string({ error: 'Verification code is required.' }).regex(/^\d{6}$/, 'Enter the 6-digit code.'),
    })
    .strict(),
);

export const resendOtpSchema = requestEnvelope(
  z.object({ email }).strict(),
);

export const loginSchema = requestEnvelope(
  z
    .object({
      email,
      password: z.string({ error: 'Password is required.' }).min(1, 'Password is required.'),
      remember: z.boolean().optional().default(true),
    })
    .strict(),
);

export const googleLoginSchema = requestEnvelope(
  z.object({
    credential: z
      .string({ error: 'Google credential is required.' })
      .trim()
      .min(20, 'Google credential is invalid.')
      .max(8192, 'Google credential is invalid.'),
  }).strict(),
);

export const forgotPasswordSchema = requestEnvelope(z.object({ email }).strict());

export const verifyResetOtpSchema = requestEnvelope(
  z.object({
    email,
    otp: z.string({ error: 'Reset code is required.' }).regex(/^\d{6}$/, 'Enter the 6-digit code.'),
  }).strict(),
);

export const resetPasswordSchema = requestEnvelope(
  z.object({
    resetToken: z.string({ error: 'Password reset token is required.' }).min(20).max(4096),
    newPassword: password,
  }).strict(),
);
