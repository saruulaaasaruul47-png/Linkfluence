import 'dotenv/config';
import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  TEST_DATABASE_URL: z.string().min(1).optional(),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_PASSWORD_RESET_SECRET: z.string().min(32).optional(),
  JWT_ACCESS_EXPIRES_IN: z.string().min(2).default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().min(2).default('7d'),
  JWT_PASSWORD_RESET_EXPIRES_IN: z.string().min(2).default('10m'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  REFRESH_COOKIE_NAME: z.string().min(1).default('refreshToken'),
  COOKIE_SECURE: booleanFromString,
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  OTP_EXPIRES_IN_MINUTES: z.coerce.number().int().min(1).max(60).default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().min(1).max(3600).default(60),
  MEDIA_MAX_IMAGE_BYTES: z.coerce.number().int().min(1024).default(8 * 1024 * 1024),
  MEDIA_MAX_VIDEO_BYTES: z.coerce.number().int().min(1024).default(25 * 1024 * 1024),
  RESEND_API_KEY: z.string().optional().default(''),
  RESEND_FROM_EMAIL: z.string().min(3).default('Influence Hub <noreply@example.com>'),
  PAYMENT_PROVIDER: z.enum(['mock']).default('mock'),
  PAYMENT_WEBHOOK_SECRET: z.string().min(32).default('local-payment-webhook-secret-change-me'),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  const message = result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
  throw new Error(`Invalid environment configuration: ${message}`);
}

if (result.data.COOKIE_SAME_SITE === 'none' && !result.data.COOKIE_SECURE) {
  throw new Error('Invalid environment configuration: COOKIE_SECURE must be true when COOKIE_SAME_SITE is none.');
}

if (result.data.NODE_ENV === 'production') {
  const errors = [];
  if (!result.data.CLIENT_URL.startsWith('https://')) errors.push('CLIENT_URL must use HTTPS');
  if (!result.data.COOKIE_SECURE) errors.push('COOKIE_SECURE must be true');
  if (!result.data.JWT_PASSWORD_RESET_SECRET) errors.push('JWT_PASSWORD_RESET_SECRET is required');
  if (result.data.JWT_PASSWORD_RESET_SECRET === result.data.JWT_ACCESS_SECRET) {
    errors.push('JWT_PASSWORD_RESET_SECRET must differ from JWT_ACCESS_SECRET');
  }
  if (!result.data.RESEND_API_KEY) errors.push('RESEND_API_KEY is required');
  if (result.data.PAYMENT_WEBHOOK_SECRET === 'local-payment-webhook-secret-change-me') {
    errors.push('PAYMENT_WEBHOOK_SECRET must be changed');
  }
  if (/example\.com/i.test(result.data.RESEND_FROM_EMAIL)) {
    errors.push('RESEND_FROM_EMAIL must use a configured sender domain');
  }
  if (errors.length) {
    throw new Error(`Invalid production environment configuration: ${errors.join('; ')}`);
  }
}

export const env = {
  nodeEnv: result.data.NODE_ENV,
  port: result.data.PORT,
  databaseUrl:
    result.data.NODE_ENV === 'test' && result.data.TEST_DATABASE_URL
      ? result.data.TEST_DATABASE_URL
      : result.data.DATABASE_URL,
  clientUrl: result.data.CLIENT_URL,
  jwtAccessSecret: result.data.JWT_ACCESS_SECRET,
  jwtRefreshSecret: result.data.JWT_REFRESH_SECRET,
  jwtPasswordResetSecret: result.data.JWT_PASSWORD_RESET_SECRET || result.data.JWT_ACCESS_SECRET,
  jwtAccessExpiresIn: result.data.JWT_ACCESS_EXPIRES_IN,
  jwtRefreshExpiresIn: result.data.JWT_REFRESH_EXPIRES_IN,
  jwtPasswordResetExpiresIn: result.data.JWT_PASSWORD_RESET_EXPIRES_IN,
  bcryptSaltRounds: result.data.BCRYPT_SALT_ROUNDS,
  refreshCookieName: result.data.REFRESH_COOKIE_NAME,
  cookieSecure: result.data.COOKIE_SECURE,
  cookieSameSite: result.data.COOKIE_SAME_SITE,
  otpExpiresInMinutes: result.data.OTP_EXPIRES_IN_MINUTES,
  otpMaxAttempts: result.data.OTP_MAX_ATTEMPTS,
  otpResendCooldownSeconds: result.data.OTP_RESEND_COOLDOWN_SECONDS,
  mediaMaxImageBytes: result.data.MEDIA_MAX_IMAGE_BYTES,
  mediaMaxVideoBytes: result.data.MEDIA_MAX_VIDEO_BYTES,
  resendApiKey: result.data.RESEND_API_KEY,
  resendFromEmail: result.data.RESEND_FROM_EMAIL,
  paymentProvider: result.data.PAYMENT_PROVIDER,
  paymentWebhookSecret: result.data.PAYMENT_WEBHOOK_SECRET,
};
