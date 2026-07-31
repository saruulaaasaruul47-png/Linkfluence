import { z } from 'zod';
const empty = z.object({}).strict();
const id = z.string().trim().min(1).max(100);
const envelope = (body = empty, params = empty, query = empty) => z.object({ body, params, query });
export const fundingIntentSchema = envelope(z.object({
  paymentMethodId: id.optional(),
  autoConfirm: z.boolean().default(false),
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
export const paymentIdSchema = envelope(z.object({}).strict(), z.object({ id }));
export const paymentListSchema = envelope(z.unknown().optional(), empty, z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'FUNDED', 'RELEASED', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED']).optional(),
  type: z.enum(['FUNDING', 'MILESTONE_RELEASE', 'PAYOUT', 'REFUND', 'COMMISSION']).optional(),
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
export const payoutSchema = envelope(z.object({ autoConfirm: z.boolean().default(false) }).strict(), z.object({ id }));
