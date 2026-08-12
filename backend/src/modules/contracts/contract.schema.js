import { z } from 'zod';
const empty = z.object({}).strict();
const id = z.string().trim().min(1).max(100);
const envelope = (body = empty, params = empty, query = empty) => z.object({ body, params, query });
export const contractListSchema = envelope(z.unknown().optional(), empty, z.object({
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'CHANGES_REQUESTED', 'ACTIVE', 'TERMINATED']).optional(),
  cursor: id.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().max(100).optional(),
}).strict());
export const contractIdSchema = envelope(z.unknown().optional(), z.object({ id }));
export const contractActionSchema = envelope(z.object({
  action: z.enum(['APPROVE', 'REQUEST_CHANGES']),
  note: z.string().trim().min(3).max(2000).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.action === 'REQUEST_CHANGES' && !value.note) ctx.addIssue({ code: 'custom', path: ['note'], message: 'A change note is required.' });
}), z.object({ id }));
export const contractDocumentSchema = envelope(z.unknown().optional(), z.object({ id }), z.object({
  version: z.coerce.number().int().min(1).optional(),
}).strict());
