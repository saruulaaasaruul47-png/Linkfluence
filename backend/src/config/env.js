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
  MEDIA_MAX_DOCUMENT_BYTES: z.coerce.number().int().min(1024).default(15 * 1024 * 1024),
  MEDIA_MAX_AUDIO_BYTES: z.coerce.number().int().min(1024).default(12 * 1024 * 1024),
  RESEND_API_KEY: z.string().optional().default(''),
  RESEND_FROM_EMAIL: z.string().min(3).default('Influence Hub <onboarding@resend.dev>'),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  PAYMENT_PROVIDER: z.enum(['mock', 'qpay', 'stripe']).default('mock'),
  PAYMENT_WEBHOOK_SECRET: z.string().min(32).default('local-payment-webhook-secret-change-me'),
  PAYMENT_COMMISSION_PERCENT: z.coerce.number().min(0).max(100).default(10),
  PAYOUT_MINIMUM_AMOUNT: z.coerce.number().positive().default(50000),
  DELIVERABLE_AUTO_APPROVAL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  PAYOUT_ACCOUNT_ENCRYPTION_KEY: z.string().optional().default(''),
  QPAY_BASE_URL: z.string().url().default('https://merchant-sandbox.qpay.mn'),
  QPAY_CLIENT_ID: z.string().optional().default(''),
  QPAY_CLIENT_SECRET: z.string().optional().default(''),
  QPAY_INVOICE_CODE: z.string().optional().default(''),
  QPAY_CALLBACK_TOKEN: z.string().optional().default(''),
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
  API_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
  SOCIAL_PROVIDER_MODE: z.enum(['sandbox', 'meta']).default('sandbox'),
  SOCIAL_TOKEN_ENCRYPTION_KEY: z.string().optional().default(''),
  SOCIAL_SYNC_STALE_HOURS: z.coerce.number().int().min(1).max(168).default(24),
  META_APP_ID: z.string().optional().default(''),
  META_APP_SECRET: z.string().optional().default(''),
  META_GRAPH_VERSION: z.string().regex(/^v\d+\.\d+$/).default('v23.0'),
  META_REDIRECT_URI: z.string().url().optional(),
  META_INSTAGRAM_REDIRECT_URI: z.string().url().optional(),
  META_FACEBOOK_REDIRECT_URI: z.string().url().optional(),
  META_WEBHOOK_VERIFY_TOKEN: z.string().optional().default(''),
  RABBITMQ_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  QUEUE_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(5),
  QUEUE_RETRY_BASE_MS: z.coerce.number().int().min(10).max(60000).default(1000),
  OUTBOX_POLL_MS: z.coerce.number().int().min(100).max(60000).default(1000),
  MEDIA_SIGNING_SECRET: z.string().min(32).optional(),
  MEDIA_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(30).max(3600).default(300),
  SLOW_REQUEST_THRESHOLD_MS: z.coerce.number().int().min(10).max(60000).default(750),
  MEDIA_STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  S3_REGION: z.string().optional().default(''),
  S3_BUCKET: z.string().optional().default(''),
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY_ID: z.string().optional().default(''),
  S3_SECRET_ACCESS_KEY: z.string().optional().default(''),
  S3_FORCE_PATH_STYLE: booleanFromString,
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
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
  if (!result.data.GOOGLE_CLIENT_ID) errors.push('GOOGLE_CLIENT_ID is required');
  if (result.data.PAYMENT_WEBHOOK_SECRET === 'local-payment-webhook-secret-change-me') {
    errors.push('PAYMENT_WEBHOOK_SECRET must be changed');
  }
  if (!result.data.PAYOUT_ACCOUNT_ENCRYPTION_KEY) errors.push('PAYOUT_ACCOUNT_ENCRYPTION_KEY is required');
  if (result.data.PAYMENT_PROVIDER === 'qpay') {
    if (!result.data.QPAY_CLIENT_ID) errors.push('QPAY_CLIENT_ID is required when PAYMENT_PROVIDER=qpay');
    if (!result.data.QPAY_CLIENT_SECRET) errors.push('QPAY_CLIENT_SECRET is required when PAYMENT_PROVIDER=qpay');
    if (!result.data.QPAY_INVOICE_CODE) errors.push('QPAY_INVOICE_CODE is required when PAYMENT_PROVIDER=qpay');
    if (result.data.QPAY_CALLBACK_TOKEN.length < 32) errors.push('QPAY_CALLBACK_TOKEN must contain at least 32 characters');
  }
  if (result.data.PAYMENT_PROVIDER === 'stripe') {
    if (!result.data.STRIPE_SECRET_KEY.startsWith('sk_')) errors.push('STRIPE_SECRET_KEY is required when PAYMENT_PROVIDER=stripe');
    if (!result.data.STRIPE_WEBHOOK_SECRET.startsWith('whsec_')) errors.push('STRIPE_WEBHOOK_SECRET is required when PAYMENT_PROVIDER=stripe');
  }
  if (/example\.com/i.test(result.data.RESEND_FROM_EMAIL)) {
    errors.push('RESEND_FROM_EMAIL must use a configured sender domain');
  }
  if (!result.data.SOCIAL_TOKEN_ENCRYPTION_KEY) errors.push('SOCIAL_TOKEN_ENCRYPTION_KEY is required');
  if (result.data.SOCIAL_PROVIDER_MODE === 'meta') {
    if (!result.data.META_APP_ID) errors.push('META_APP_ID is required when SOCIAL_PROVIDER_MODE=meta');
    if (!result.data.META_APP_SECRET) errors.push('META_APP_SECRET is required when SOCIAL_PROVIDER_MODE=meta');
    if (!result.data.META_REDIRECT_URI
      && (!result.data.META_INSTAGRAM_REDIRECT_URI || !result.data.META_FACEBOOK_REDIRECT_URI)) {
      errors.push('Both provider-specific Meta redirect URIs (or META_REDIRECT_URI) are required when SOCIAL_PROVIDER_MODE=meta');
    }
    if (result.data.META_WEBHOOK_VERIFY_TOKEN.length < 32) {
      errors.push('META_WEBHOOK_VERIFY_TOKEN must contain at least 32 characters when SOCIAL_PROVIDER_MODE=meta');
    }
  }
  if (result.data.MEDIA_STORAGE_DRIVER === 's3') {
    if (!result.data.S3_REGION) errors.push('S3_REGION is required when MEDIA_STORAGE_DRIVER=s3');
    if (!result.data.S3_BUCKET) errors.push('S3_BUCKET is required when MEDIA_STORAGE_DRIVER=s3');
    if (!result.data.S3_ACCESS_KEY_ID) errors.push('S3_ACCESS_KEY_ID is required when MEDIA_STORAGE_DRIVER=s3');
    if (!result.data.S3_SECRET_ACCESS_KEY) errors.push('S3_SECRET_ACCESS_KEY is required when MEDIA_STORAGE_DRIVER=s3');
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
  mediaMaxDocumentBytes: result.data.MEDIA_MAX_DOCUMENT_BYTES,
  mediaMaxAudioBytes: result.data.MEDIA_MAX_AUDIO_BYTES,
  resendApiKey: result.data.RESEND_API_KEY,
  resendFromEmail: result.data.RESEND_FROM_EMAIL,
  googleClientId: result.data.GOOGLE_CLIENT_ID,
  paymentProvider: result.data.PAYMENT_PROVIDER,
  paymentWebhookSecret: result.data.PAYMENT_WEBHOOK_SECRET,
  paymentCommissionPercent: result.data.PAYMENT_COMMISSION_PERCENT,
  payoutMinimumAmount: result.data.PAYOUT_MINIMUM_AMOUNT,
  deliverableAutoApprovalDays: result.data.DELIVERABLE_AUTO_APPROVAL_DAYS,
  payoutAccountEncryptionKey: result.data.PAYOUT_ACCOUNT_ENCRYPTION_KEY,
  qpayBaseUrl: result.data.QPAY_BASE_URL,
  qpayClientId: result.data.QPAY_CLIENT_ID,
  qpayClientSecret: result.data.QPAY_CLIENT_SECRET,
  qpayInvoiceCode: result.data.QPAY_INVOICE_CODE,
  qpayCallbackToken: result.data.QPAY_CALLBACK_TOKEN,
  stripeSecretKey: result.data.STRIPE_SECRET_KEY,
  stripeWebhookSecret: result.data.STRIPE_WEBHOOK_SECRET,
  apiPublicUrl: result.data.API_PUBLIC_URL,
  socialProviderMode: result.data.SOCIAL_PROVIDER_MODE,
  socialTokenEncryptionKey: result.data.SOCIAL_TOKEN_ENCRYPTION_KEY,
  socialSyncStaleHours: result.data.SOCIAL_SYNC_STALE_HOURS,
  metaAppId: result.data.META_APP_ID,
  metaAppSecret: result.data.META_APP_SECRET,
  metaGraphVersion: result.data.META_GRAPH_VERSION,
  metaRedirectUri: result.data.META_REDIRECT_URI,
  metaInstagramRedirectUri: result.data.META_INSTAGRAM_REDIRECT_URI,
  metaFacebookRedirectUri: result.data.META_FACEBOOK_REDIRECT_URI,
  metaWebhookVerifyToken: result.data.META_WEBHOOK_VERIFY_TOKEN,
  rabbitMqUrl: result.data.RABBITMQ_URL,
  redisUrl: result.data.REDIS_URL,
  queueMaxAttempts: result.data.QUEUE_MAX_ATTEMPTS,
  queueRetryBaseMs: result.data.QUEUE_RETRY_BASE_MS,
  outboxPollMs: result.data.OUTBOX_POLL_MS,
  mediaSigningSecret: result.data.MEDIA_SIGNING_SECRET || result.data.JWT_ACCESS_SECRET,
  mediaSignedUrlTtlSeconds: result.data.MEDIA_SIGNED_URL_TTL_SECONDS,
  slowRequestThresholdMs: result.data.SLOW_REQUEST_THRESHOLD_MS,
  mediaStorageDriver: result.data.MEDIA_STORAGE_DRIVER,
  s3Region: result.data.S3_REGION,
  s3Bucket: result.data.S3_BUCKET,
  s3Endpoint: result.data.S3_ENDPOINT,
  s3AccessKeyId: result.data.S3_ACCESS_KEY_ID,
  s3SecretAccessKey: result.data.S3_SECRET_ACCESS_KEY,
  s3ForcePathStyle: result.data.S3_FORCE_PATH_STYLE,
  sentryDsn: result.data.SENTRY_DSN,
  sentryTracesSampleRate: result.data.SENTRY_TRACES_SAMPLE_RATE,
};
