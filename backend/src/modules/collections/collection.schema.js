import { z } from 'zod';

const empty = z.object({}).strict();
const id = z.string().trim().min(1).max(100);
const visibility = z.preprocess(
  (value) => String(value || '').toUpperCase(),
  z.enum(['PRIVATE', 'UNLISTED', 'PUBLIC']),
);
const targetType = z.preprocess(
  (value) => String(value || '').toUpperCase(),
  z.enum(['CREATOR', 'BUSINESS', 'CAMPAIGN', 'PORTFOLIO', 'SHOWCASE', 'CONTENT']),
);
const envelope = (body = empty, params = empty, query = empty) => z.object({ body, params, query });

export const collectionListSchema = envelope(z.unknown().optional());
export const collectionDetailSchema = envelope(
  z.unknown().optional(),
  z.object({ id }),
  z.object({ token: z.string().trim().min(16).max(200).optional() }).strict(),
);
export const createCollectionSchema = envelope(z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  coverUrl: z.string().trim().url().max(2048).optional(),
  visibility: visibility.default('PRIVATE'),
}).strict());
export const updateCollectionSchema = envelope(
  z.object({
    name: z.string().trim().min(2).max(80).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    coverUrl: z.string().trim().url().max(2048).nullable().optional(),
    visibility: visibility.optional(),
  }).strict().refine((body) => Object.keys(body).length > 0, 'Submit at least one change.'),
  z.object({ id }),
);
export const collectionIdSchema = envelope(z.unknown().optional(), z.object({ id }));
export const collectionItemSchema = envelope(
  z.object({ note: z.string().trim().max(300).optional() }).strict(),
  z.object({ id, targetType, targetId: id }),
);
export const collectionItemDeleteSchema = envelope(
  z.unknown().optional(),
  z.object({ id, targetType, targetId: id }),
);
