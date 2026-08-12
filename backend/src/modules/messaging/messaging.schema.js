import { z } from 'zod';

const id = z.string().cuid();
const envelope = ({
  body = z.object({}).strict().optional().default({}),
  params = z.object({}).passthrough(),
  query = z.object({}).passthrough(),
}) => z.object({ body, params, query });

export const conversationListSchema = envelope({ query: z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict() });
export const conversationIdSchema = envelope({ params: z.object({ id }) });
export const createConversationSchema = envelope({ body: z.object({ collaborationId: id }).strict() });
export const createMessageRequestSchema = envelope({ body: z.object({
  recipientType: z.enum(['CREATOR', 'BUSINESS']),
  recipientId: z.string().trim().min(1).max(100),
  message: z.string().trim().min(2).max(1000),
}).strict() });
export const messageRequestListSchema = envelope({ query: z.object({
  box: z.enum(['incoming', 'outgoing']).default('incoming'),
  status: z.enum(['PENDING', 'ACCEPTED', 'DECLINED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict() });
export const messageRequestDecisionSchema = envelope({
  params: z.object({ id }),
  body: z.object({ action: z.enum(['ACCEPT', 'DECLINE']) }).strict(),
});
export const messageListSchema = envelope({
  params: z.object({ id }),
  query: z.object({ cursor: id.optional(), limit: z.coerce.number().int().min(1).max(100).default(30) }).strict(),
});
export const sendMessageSchema = envelope({
  params: z.object({ id }),
  body: z.object({
    body: z.string().trim().max(5000).optional(),
    attachment: z.object({
      mediaAssetId: id,
      name: z.string().trim().min(1).max(255),
      url: z.string().trim().min(1).max(2048).optional(),
      mimeType: z.string().trim().max(120).optional(),
      sizeBytes: z.coerce.number().int().min(0).max(25 * 1024 * 1024).optional(),
    }).strict().optional(),
  }).strict().refine((value) => value.body || value.attachment, 'Add a message or attachment.'),
});
export const messageMutationSchema = envelope({
  params: z.object({ id, messageId: id }),
  body: z.object({ body: z.string().trim().min(1).max(5000) }).strict(),
});
export const messageDeleteSchema = envelope({ params: z.object({ id, messageId: id }) });
