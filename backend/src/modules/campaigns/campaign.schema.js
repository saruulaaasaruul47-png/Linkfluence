import { z } from 'zod';
import { MARKETPLACE_CATEGORIES } from '../../shared/constants/category.constants.js';

const empty = z.object({}).strict();
const id = z.string().trim().min(1).max(100);
const platform = z.enum(['INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'FACEBOOK', 'X', 'OTHER']);
const campaignStatus = z.enum(['DRAFT', 'OPEN', 'PAUSED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ARCHIVED']);
const date = z.coerce.date();
const jsonValue = z.union([
  z.string().trim().max(2000),
  z.array(z.string().trim().max(300)).max(30),
  z.object({}).passthrough(),
]);
const envelope = (body = empty, params = empty, query = empty) => z.object({ body, params, query });
const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
};
const campaignBody = {
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(10).max(5000),
  category: z.enum(MARKETPLACE_CATEGORIES),
  goal: z.string().trim().max(200).optional(),
  platforms: z.array(platform).max(6).default([]),
  budgetMin: z.coerce.number().nonnegative().optional(),
  budgetMax: z.coerce.number().nonnegative().optional(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default('MNT'),
  applicationDeadline: date.optional(),
  deadline: date.optional(),
  deliverables: jsonValue.optional(),
  requirements: jsonValue.optional(),
};

export const publicCampaignListSchema = envelope(z.unknown().optional(), empty, z.object({
  q: z.string().trim().max(100).optional(),
  category: z.enum(MARKETPLACE_CATEGORIES).optional(),
  platform: platform.optional(),
  minBudget: z.coerce.number().nonnegative().optional(),
  maxBudget: z.coerce.number().nonnegative().optional(),
  sort: z.enum(['newest', 'deadline', 'budget_low', 'budget_high']).default('newest'),
  ...pagination,
}).strict());
export const ownerCampaignListSchema = envelope(z.unknown().optional(), empty, z.object({
  q: z.string().trim().max(100).optional(),
  status: campaignStatus.optional(),
  ...pagination,
}).strict());
export const campaignIdSchema = envelope(z.unknown().optional(), z.object({ id }));
export const publishCampaignSchema = envelope(
  z.object({ isPublic: z.boolean().default(true) }).strict(),
  z.object({ id }),
);
export const createCampaignSchema = envelope(
  z.object(campaignBody).strict().superRefine((body, ctx) => {
    if (body.budgetMin !== undefined && body.budgetMax !== undefined && body.budgetMin > body.budgetMax) {
      ctx.addIssue({ code: 'custom', path: ['budgetMax'], message: 'Maximum budget must be at least the minimum budget.' });
    }
  }),
);
export const updateCampaignSchema = envelope(
  z.object({
    ...Object.fromEntries(Object.entries(campaignBody).map(([key, validator]) => [key, validator.optional()])),
    version: z.coerce.number().int().min(1).optional(),
  }).strict().refine((body) => Object.keys(body).length > 0, 'Submit at least one change.'),
  z.object({ id }),
);
