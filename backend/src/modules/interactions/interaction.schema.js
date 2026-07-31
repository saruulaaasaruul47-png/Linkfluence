import { z } from 'zod';

const targetType = z.enum(['creator', 'business', 'campaign', 'portfolio', 'showcase', 'content'])
  .transform((value) => value.toUpperCase());
const targetParams = z.object({
  targetType,
  targetId: z.string().trim().min(1).max(100),
});
const empty = z.object({}).strict();
const envelope = (body = empty, params = empty, query = empty) => z.object({ body, params, query });

export const libraryStateSchema = envelope(z.unknown().optional());
export const targetActionSchema = envelope(z.unknown().optional(), targetParams);
export const recentSchema = envelope(z.object({
  targetType,
  targetId: z.string().trim().min(1).max(100),
}).strict());
export const shareSchema = envelope(z.object({
  targetType,
  targetId: z.string().trim().min(1).max(100),
  channel: z.string().trim().max(40).optional(),
}).strict());
