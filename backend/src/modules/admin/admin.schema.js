import { z } from 'zod';
const id = z.string().cuid();
const page = {
  q: z.string().trim().max(120).optional(),
  status: z.string().trim().max(40).optional(),
  kind: z.enum(['REPORT', 'DISPUTE', 'VERIFICATION', 'MODERATION']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};
const envelope = ({
  body = z.object({}).strict().optional().default({}),
  params = z.object({}).passthrough(),
  query = z.object({}).passthrough(),
} = {}) => z.object({ body, params, query });
export const adminListSchema = envelope({ query: z.object(page).strict() });
const financePage = {
  ...page,
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase()).optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
};
export const financeListSchema = envelope({ query: z.object({
  ...financePage,
  type: z.enum(['PAYMENTS', 'TOP_UPS', 'COLLABORATION_FUNDING', 'PLATFORM_FEES', 'PAYOUTS', 'REFUNDS']).optional(),
  source: z.enum(['COMMISSIONS', 'BARTER_SERVICE_FEE', 'OTHER']).optional(),
}).strict().superRefine((value, context) => {
  if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
    context.addIssue({ code: 'custom', path: ['dateTo'], message: 'dateTo must be on or after dateFrom.' });
  }
}) });
export const financeDetailSchema = envelope({ params: z.object({
  resource: z.enum(['transactions', 'revenue', 'payouts', 'refunds']),
  id,
}) });
export const adminSearchSchema = envelope({ query: z.object({ q: z.string().trim().min(2).max(120), limit: z.coerce.number().int().min(1).max(25).default(10) }).strict() });
export const userStatusSchema = envelope({
  params: z.object({ id }),
  body: z.object({ status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']), reason: z.string().trim().min(5).max(1000) }).strict(),
});
export const caseResolutionSchema = envelope({
  params: z.object({ id }),
  body: z.object({ action: z.enum(['RESOLVE', 'DISMISS', 'ESCALATE']), resolution: z.string().trim().min(5).max(3000), reason: z.string().trim().min(5).max(1000) }).strict(),
});
export const announcementSchema = envelope({ body: z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(5).max(2000),
  href: z.string().trim().max(500).optional(),
  audience: z.enum(['ALL', 'CREATOR', 'BUSINESS']).default('ALL'),
  reason: z.string().trim().min(5).max(1000),
}).strict() });
const auditedStatus = (statuses) => envelope({ params: z.object({ id }), body: z.object({ status: z.enum(statuses), reason: z.string().trim().min(5).max(1000) }).strict() });
export const channelVerificationSchema = envelope({ params: z.object({ type: z.enum(['creator', 'business']), id }), body: z.object({ status: z.enum(['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED']), reason: z.string().trim().min(5).max(1000) }).strict() });
export const campaignStatusSchema = auditedStatus(['OPEN', 'PAUSED', 'CANCELLED', 'ARCHIVED']);
export const contractFreezeSchema = envelope({ params: z.object({ id }), body: z.object({ reason: z.string().trim().min(5).max(1000) }).strict() });
export const adminRefundSchema = envelope({ params: z.object({ id }), body: z.object({ amount: z.coerce.number().positive().optional(), reason: z.string().trim().min(5).max(1000) }).strict() });
export const payoutReconcileSchema = auditedStatus(['PENDING', 'PROCESSING', 'FAILED']);
export const reconciliationRunSchema = envelope({ body: z.object({ periodStart: z.string().datetime(), periodEnd: z.string().datetime() }).strict() });
export const payoutDecisionSchema = envelope({ params: z.object({ id }), body: z.object({ action: z.enum(['APPROVE', 'REJECT']), reason: z.string().trim().min(5).max(1000), autoConfirm: z.boolean().default(false) }).strict() });
export const proofDecisionSchema = envelope({ params: z.object({ id }), body: z.object({ action: z.enum(['APPROVE', 'REJECT']), reason: z.string().trim().min(5).max(1000) }).strict() });
export const disputeAwardSchema = envelope({ params: z.object({ id }), body: z.object({
  award: z.enum(['CREATOR_WINS', 'BUSINESS_WINS', 'SPLIT']),
  creatorPercent: z.coerce.number().min(1).max(99).optional(),
  reason: z.string().trim().min(10).max(3000),
}).strict().superRefine((value, context) => {
  if (value.award === 'SPLIT' && value.creatorPercent == null) context.addIssue({ code: 'custom', path: ['creatorPercent'], message: 'creatorPercent is required for split awards.' });
}) });

const settingValues = z.object({
  maintenance: z.boolean().optional(),
  creatorApplications: z.boolean().optional(),
  businessApplications: z.boolean().optional(),
  manualReview: z.boolean().optional(),
  publicPricing: z.boolean().optional(),
  commission: z.coerce.number().min(0).max(100).optional(),
  barterPlatformFee: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  minimumTopUp: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  minimumPayout: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  refundPolicy: z.object({ beforeWorkPercent: z.coerce.number().min(0).max(100), afterWorkPercent: z.coerce.number().min(0).max(100) }).strict().optional(),
  settlement: z.enum(['weekly', 'monthly']).optional(),
  require2fa: z.boolean().optional(),
  newDeviceAlerts: z.boolean().optional(),
  outboxBacklogThreshold: z.coerce.number().int().min(10).max(1_000_000).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one setting is required.');

export const updateSettingsSchema = envelope({ body: z.object({
  settings: settingValues,
  reason: z.string().trim().min(5).max(1000),
}).strict() });

const featureFlagFields = {
  key: z.string().trim().regex(/^[a-z][a-z0-9_]{2,63}$/),
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().max(500).optional(),
  enabled: z.boolean().default(true),
  rolloutPercentage: z.coerce.number().int().min(0).max(100).default(100),
  allowedRoles: z.array(z.enum(['VIEWER', 'CREATOR', 'BUSINESS', 'ADMIN'])).max(4).default([]),
};
export const createFeatureFlagSchema = envelope({ body: z.object({
  ...featureFlagFields,
  reason: z.string().trim().min(5).max(1000),
}).strict() });
export const updateFeatureFlagSchema = envelope({
  params: z.object({ id }),
  body: z.object({
    name: featureFlagFields.name.optional(), description: featureFlagFields.description,
    enabled: z.boolean().optional(), rolloutPercentage: z.coerce.number().int().min(0).max(100).optional(),
    allowedRoles: z.array(z.enum(['VIEWER', 'CREATOR', 'BUSINESS', 'ADMIN'])).max(4).optional(),
    reason: z.string().trim().min(5).max(1000),
  }).strict().refine((value) => Object.keys(value).some((key) => key !== 'reason'), 'At least one flag change is required.'),
});
export const contentModerationSchema = envelope({
  params: z.object({ id }),
  body: z.object({ reason: z.string().trim().min(5).max(1000) }).strict(),
});
