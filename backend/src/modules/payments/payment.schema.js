import { z } from 'zod';
const empty = z.object({}).strict();
const id = z.string().trim().min(1).max(100);
const envelope = (body = empty, params = empty, query = empty) => z.object({ body, params, query });
export const fundingIntentSchema = envelope(z.object({
  paymentMethodId: id.optional(),
  idempotencyKey: z.string().trim().min(8).max(160).optional(),
  autoConfirm: z.boolean().default(false),
}).strict(), z.object({ id }));
export const walletTopUpSchema = envelope(z.object({
  amount: z.coerce.number().positive().max(1000000000000),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default('MNT'),
  idempotencyKey: z.string().trim().min(8).max(160),
}).strict());
export const walletTopUpReconcileSchema = envelope();
export const walletSummarySchema = envelope(z.unknown().optional(), empty, z.object({
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default('MNT'),
}).strict());
export const walletFundingSchema = envelope(z.object({
  paymentMethod: z.literal('WALLET').default('WALLET'),
  idempotencyKey: z.string().trim().min(8).max(160),
}).strict(), z.object({ id }));
export const webhookSchema = envelope(z.object({
  id,
  type: z.enum(['funding.succeeded', 'release.succeeded', 'refund.succeeded', 'payout.succeeded', 'payment.failed']),
  createdAt: z.string().datetime().optional(),
  data: z.object({
    providerRef: id,
    amount: z.coerce.number().positive(),
    currency: z.string().trim().length(3).transform((v) => v.toUpperCase()),
    failureReason: z.string().max(1000).optional(),
  }).strict(),
}).strict());
export const qpayCallbackSchema = envelope(z.object({}).passthrough(), empty, z.object({ paymentId: id, token: z.string().min(16).max(256) }).strict());
export const paymentIdSchema = envelope(z.object({}).strict(), z.object({ id }));
export const paymentListSchema = envelope(z.unknown().optional(), empty, z.object({
  status: z.enum(['PENDING', 'FUNDING_REQUIRED', 'PROCESSING', 'FUNDED', 'IN_PROGRESS', 'READY_FOR_RELEASE', 'RELEASED', 'PAID', 'PARTIALLY_REFUNDED', 'FAILED', 'REFUNDED', 'CANCELLED']).optional(),
  type: z.enum(['FUNDING', 'BARTER_PLATFORM_FEE', 'MILESTONE_RELEASE', 'PAYOUT', 'REFUND', 'COMMISSION']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict());
export const addMethodSchema = envelope(z.object({
  tokenRef: z.string().trim().regex(/^pm_[A-Za-z0-9_-]{6,}$/, 'Use a provider token; raw card data is forbidden.'),
  brand: z.string().trim().max(30).optional(),
  last4: z.string().regex(/^\d{4}$/).optional(),
  expMonth: z.coerce.number().int().min(1).max(12).optional(),
  expYear: z.coerce.number().int().min(new Date().getFullYear()).max(new Date().getFullYear() + 30).optional(),
  isDefault: z.boolean().default(false),
}).strict());
export const methodIdSchema = envelope(z.unknown().optional(), z.object({ id }));
export const refundSchema = envelope(z.object({
  amount: z.coerce.number().positive().optional(),
  reason: z.string().trim().min(5).max(1000),
  autoConfirm: z.boolean().default(false),
}).strict(), z.object({ id }));
export const payoutSchema = envelope(z.object({ payoutAccountId: id }).strict(), z.object({ id }));
export const earningsQuerySchema = envelope(z.unknown().optional(), empty, z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
}).strict());
export const payoutAccountSchema = envelope(z.object({
  provider: z.string().trim().min(2).max(80),
  accountName: z.string().trim().min(2).max(120),
  accountNumber: z.string().trim().regex(/^[A-Za-z0-9-]{6,34}$/),
  bankCode: z.string().trim().min(2).max(30).optional(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default('MNT'),
  isDefault: z.boolean().default(false),
}).strict());
