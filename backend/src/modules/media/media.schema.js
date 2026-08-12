import { z } from 'zod';

const envelope = (body, params = z.object({}).passthrough()) => z.object({
  body,
  params,
  query: z.object({}).passthrough(),
});

export const uploadMediaSchema = envelope(
  z.object({
    purpose: z.enum(['AVATAR', 'COVER', 'LOGO', 'PORTFOLIO', 'COLLABORATION', 'DELIVERABLE', 'CONTENT', 'CAMPAIGN_BRIEF']),
  }).strict(),
);

export const mediaIdSchema = envelope(
  z.unknown().optional(),
  z.object({ id: z.string().cuid() }),
);

const purpose = z.enum(['AVATAR', 'COVER', 'LOGO', 'PORTFOLIO', 'COLLABORATION', 'DELIVERABLE', 'CONTENT', 'CAMPAIGN_BRIEF']);
export const signedUrlSchema = z.object({
  body: z.object({ purpose }).strict(), params: z.object({}).passthrough(), query: z.object({}).passthrough(),
});
export const signedUploadSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({ ownerId: z.string().cuid() }),
  query: z.object({ purpose, expires: z.coerce.number().int().positive(), signature: z.string().length(64) }).strict(),
});
export const signedContentSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({ id: z.string().cuid() }),
  query: z.object({ subject: z.string().cuid(), expires: z.coerce.number().int().positive(), signature: z.string().length(64) }).strict(),
});
