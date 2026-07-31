import { z } from 'zod';

const empty = z.object({}).strict();
const id = z.string().trim().min(1).max(100);
const envelope = (body = empty, params = empty, query = empty) => z.object({ body, params, query });

export const createOfferSchema = envelope(z.object({
  creatorId: id,
  campaignId: id.optional(),
  title: z.string().trim().min(2).max(160),
  contentType: z.string().trim().min(2).max(160),
  budget: z.coerce.number().positive().max(1000000000000),
  currency: z.string().trim().length(3).transform((v) => v.toUpperCase()).default('MNT'),
  timeline: z.string().trim().min(2).max(300),
  message: z.string().trim().min(10).max(5000),
}).strict());
export const offerIdSchema = envelope(z.unknown().optional(), z.object({ id }));
export const listOffersSchema = envelope(z.unknown().optional(), empty, z.object({
  side: z.enum(['creator', 'business']),
  status: z.enum(['PENDING_CREATOR_RESPONSE', 'INTERESTED', 'COUNTER_PROPOSAL_SENT', 'CHANGES_REQUESTED', 'APPROVED', 'DECLINED', 'DECLINED_BY_BUSINESS', 'CANCELLED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict());
export const creatorResponseSchema = envelope(z.object({
  action: z.enum(['INTERESTED', 'COUNTER', 'DECLINE']),
  requestedPayment: z.coerce.number().positive().max(1000000000000).optional(),
  availableTimeline: z.string().trim().min(2).max(300).optional(),
  idea: z.string().trim().min(2).max(2000).optional(),
  message: z.string().trim().max(2000).optional(),
  reason: z.string().trim().max(1000).optional(),
  version: z.coerce.number().int().min(1).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.action === 'COUNTER') {
    for (const field of ['requestedPayment', 'availableTimeline', 'idea']) {
      if (!value[field]) ctx.addIssue({ code: 'custom', path: [field], message: `${field} is required.` });
    }
  }
}), z.object({ id }));
export const businessDecisionSchema = envelope(z.object({
  action: z.enum(['APPROVE', 'REQUEST_CHANGES', 'DECLINE']),
  message: z.string().trim().max(2000).optional(),
  finalBudget: z.coerce.number().positive().max(1000000000000).optional(),
  finalTimeline: z.string().trim().min(2).max(300).optional(),
  deliverables: z.string().trim().max(2000).optional(),
  contentCount: z.string().trim().max(100).optional(),
  draftDeadline: z.string().trim().max(40).optional(),
  finalDeadline: z.string().trim().max(40).optional(),
  publishDate: z.string().trim().max(40).optional(),
  revisionLimit: z.string().trim().max(100).optional(),
  usageRights: z.string().trim().max(500).optional(),
  additionalRequirements: z.string().trim().max(2000).optional(),
  version: z.coerce.number().int().min(1).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.action === 'REQUEST_CHANGES' && !value.message) {
    ctx.addIssue({ code: 'custom', path: ['message'], message: 'A change request message is required.' });
  }
}), z.object({ id }));
