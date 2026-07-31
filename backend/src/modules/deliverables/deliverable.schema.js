import { z } from 'zod';
const id = z.string().trim().min(1).max(100);
const envelope = (body, params) => z.object({ body, params, query: z.object({}).strict() });
const submission = z.object({
  mediaAssetId: id.optional(),
  title: z.string().trim().min(2).max(200),
  note: z.string().trim().max(2000).optional(),
  fileUrl: z.string().trim().min(1).max(2000),
  fileType: z.string().trim().max(150).optional(),
}).strict();
export const submitDeliverableSchema = envelope(submission, z.object({ id }));
export const reviseDeliverableSchema = envelope(submission, z.object({ id, deliverableId: id }));
export const reviewDeliverableSchema = envelope(z.object({
  decision: z.enum(['APPROVED', 'REVISION_REQUESTED']),
  note: z.string().trim().max(2000).optional(),
  autoConfirmRelease: z.boolean().default(false),
}).strict().superRefine((value, ctx) => {
  if (value.decision === 'REVISION_REQUESTED' && !value.note) ctx.addIssue({ code: 'custom', path: ['note'], message: 'A revision note is required.' });
}), z.object({ id, deliverableId: id }));
