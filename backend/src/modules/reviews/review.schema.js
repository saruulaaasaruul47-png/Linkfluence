import { z } from 'zod';
const id = z.string().trim().min(1).max(100);
const envelope = (body, params) => z.object({ body, params, query: z.object({}).strict() });
export const reviewListSchema = envelope(z.unknown().optional(), z.object({ id }));
export const submitReviewSchema = envelope(z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(3000).optional(),
}).strict(), z.object({ id }));
export const publishShowcaseSchema = envelope(z.object({
  title: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  category: z.string().trim().max(80).optional(),
  thumbnailUrl: z.string().trim().max(2000).optional(),
}).strict(), z.object({ id }));
