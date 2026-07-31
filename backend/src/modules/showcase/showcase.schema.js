import { z } from 'zod';

const empty = z.object({}).strict();
const id = z.string().trim().min(1).max(100);
const status = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
const envelope = (body = empty, params = empty, query = empty) => z.object({ body, params, query });
const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(80).optional(),
  creatorId: id.optional(),
  cursor: id.optional(),
  limit: z.coerce.number().int().min(1).max(30).default(12),
}).strict();

export const showcaseListSchema = envelope(z.unknown().optional(), empty, listQuery);
export const showcaseIdSchema = envelope(z.unknown().optional(), z.object({ id }));
export const createShowcaseSchema = envelope(z.object({
  portfolioItemId: id,
  title: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  category: z.string().trim().max(80).optional(),
  status: status.default('DRAFT'),
}).strict());
export const updateShowcaseSchema = envelope(
  z.object({
    title: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    category: z.string().trim().max(80).nullable().optional(),
    status: status.optional(),
  }).strict().refine((body) => Object.keys(body).length > 0, 'Submit at least one change.'),
  z.object({ id }),
);
