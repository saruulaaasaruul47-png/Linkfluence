import { z } from 'zod';

const envelope = (body, params = z.object({}).passthrough()) => z.object({
  body,
  params,
  query: z.object({}).passthrough(),
});

export const uploadMediaSchema = envelope(
  z.object({
    purpose: z.enum(['AVATAR', 'COVER', 'LOGO', 'PORTFOLIO', 'COLLABORATION', 'DELIVERABLE']),
  }).strict(),
);

export const mediaIdSchema = envelope(
  z.unknown().optional(),
  z.object({ id: z.string().cuid() }),
);
