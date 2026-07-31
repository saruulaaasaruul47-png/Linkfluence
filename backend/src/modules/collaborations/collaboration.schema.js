import { z } from 'zod';
const empty = z.object({}).strict();
const id = z.string().trim().min(1).max(100);
const envelope = (body = empty, params = empty, query = empty) => z.object({ body, params, query });
export const collaborationIdSchema = envelope(z.unknown().optional(), z.object({ id }));
export const collaborationListSchema = envelope(z.unknown().optional(), empty, z.object({
  side: z.enum(['creator', 'business']),
  status: z.enum(['NEGOTIATION', 'AGREEMENT_REVIEW', 'CONTRACT_REVIEW', 'PAYMENT_PENDING', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict());
export const updateTermsSchema = envelope(z.object({
  terms: z.object({}).passthrough().refine((value) => Object.keys(value).length > 0, 'Submit at least one term.'),
  changeNote: z.string().trim().max(1000).optional(),
  version: z.coerce.number().int().min(1).optional(),
}).strict(), z.object({ id }));
export const lockAgreementSchema = envelope(z.object({ version: z.coerce.number().int().min(1).optional() }).strict(), z.object({ id }));
export const agreementActionSchema = envelope(z.object({
  action: z.enum(['APPROVE', 'REQUEST_CHANGES']),
  note: z.string().trim().min(3).max(2000).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.action === 'REQUEST_CHANGES' && !value.note) ctx.addIssue({ code: 'custom', path: ['note'], message: 'A change note is required.' });
}), z.object({ id }));
export const taskSchema = envelope(z.object({}).strict(), z.object({ id, taskId: id }));
export const addFileSchema = envelope(z.object({
  mediaAssetId: id.optional(),
  name: z.string().trim().min(1).max(255),
  url: z.string().trim().min(1).max(2000),
  mimeType: z.string().trim().max(150).optional(),
  sizeBytes: z.coerce.number().int().min(0).max(100000000).optional(),
  kind: z.enum(['PROJECT', 'BRIEF', 'REFERENCE', 'CONTRACT']).default('PROJECT'),
}).strict(), z.object({ id }));
export const addActivitySchema = envelope(z.object({
  message: z.string().trim().min(1).max(2000),
}).strict(), z.object({ id }));
