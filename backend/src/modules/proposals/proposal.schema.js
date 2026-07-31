import { z } from 'zod';

const empty = z.object({}).strict();
const id = z.string().trim().min(1).max(100);
const proposalStatus = z.enum(['SUBMITTED', 'SHORTLISTED', 'COUNTERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']);
const deliverables = z.union([
  z.string().trim().max(2000),
  z.array(z.string().trim().max(300)).max(30),
  z.object({}).passthrough(),
]).optional();
const proposalBody = {
  amount: z.coerce.number().positive().max(1000000000000),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default('MNT'),
  timeline: z.string().trim().min(2).max(300),
  message: z.string().trim().min(30).max(5000),
  deliverables,
};
const envelope = (body = empty, params = empty, query = empty) => z.object({ body, params, query });

export const createProposalSchema = envelope(
  z.object(proposalBody).strict(),
  z.object({ campaignId: id }),
);
export const updateProposalSchema = envelope(
  z.object({
    ...Object.fromEntries(Object.entries(proposalBody).map(([key, validator]) => [key, validator.optional()])),
    version: z.coerce.number().int().min(1).optional(),
  }).strict().refine((body) => Object.keys(body).some((key) => key !== 'version'), 'Submit at least one change.'),
  z.object({ id }),
);
export const proposalIdSchema = envelope(z.unknown().optional(), z.object({ id }));
export const proposalListSchema = envelope(z.unknown().optional(), empty, z.object({
  campaignId: id.optional(),
  status: proposalStatus.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict());
export const proposalDecisionSchema = envelope(
  z.object({
    action: z.enum(['SHORTLIST', 'COUNTER', 'ACCEPT', 'REJECT']),
    counterAmount: z.coerce.number().positive().max(1000000000000).optional(),
    counterMessage: z.string().trim().min(5).max(2000).optional(),
    version: z.coerce.number().int().min(1).optional(),
  }).strict().superRefine((body, ctx) => {
    if (body.action === 'COUNTER' && body.counterAmount === undefined) {
      ctx.addIssue({ code: 'custom', path: ['counterAmount'], message: 'Counter amount is required.' });
    }
  }),
  z.object({ id }),
);
