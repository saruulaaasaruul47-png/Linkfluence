import { z } from 'zod';

const empty = z.object({}).strict();
const id = z.string().trim().min(1).max(100);
const envelope = (body = empty, params = empty, query = empty) => z.object({ body, params, query });
const contextQuery = z.object({ campaignId: id.optional() }).strict();

export const sourcingListSchema = envelope(z.unknown().optional(), empty, contextQuery);
export const sourcingMutationSchema = envelope(
  z.object({
    campaignId: id.optional(),
    note: z.string().trim().max(500).optional(),
  }).strict(),
  z.object({ creatorId: id }),
);
export const sourcingDeleteSchema = envelope(
  z.unknown().optional(),
  z.object({ creatorId: id }),
  contextQuery,
);
export const invitationListSchema = envelope(z.unknown().optional(), empty, z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict());
export const createInvitationSchema = envelope(z.object({
  campaignId: id,
  creatorId: id,
  message: z.string().trim().max(2000).optional(),
}).strict());
export const invitationActionSchema = envelope(
  z.object({ action: z.enum(['ACCEPT', 'DECLINE']) }).strict(),
  z.object({ id }),
);
export const invitationIdSchema = envelope(z.unknown().optional(), z.object({ id }));
