import { z } from 'zod';

const empty = z.object({}).strict();
const id = z.string().trim().min(1).max(100);
const envelope = (body = empty, params = empty, query = empty) => z.object({ body, params, query });
const channelParams = z.object({ targetType: z.enum(['creator', 'business']).transform((value) => value.toUpperCase()), targetId: id });

export const safetyTargetSchema = envelope(z.unknown().optional(), channelParams);
export const safetyStateSchema = envelope(z.unknown().optional());
export const reportSchema = envelope(z.object({
  targetType: z.enum(['creator', 'business', 'content']).transform((value) => value.toUpperCase()),
  targetId: id,
  reason: z.enum(['SPAM', 'HARASSMENT', 'IMPERSONATION', 'COPYRIGHT', 'UNSAFE_CONTENT', 'OTHER']),
  details: z.string().trim().max(1000).optional(),
  evidence: z.array(z.string().trim().min(1).max(500)).max(5).default([]),
}).strict());
