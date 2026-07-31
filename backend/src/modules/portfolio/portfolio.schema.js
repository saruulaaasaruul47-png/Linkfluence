import { z } from 'zod';

const envelope = (body, params = z.object({}).passthrough()) => z.object({
  body,
  params,
  query: z.object({}).passthrough(),
});

const fields = {
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  category: z.string().trim().max(80).optional(),
  mediaAssetId: z.string().cuid(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  sortOrder: z.coerce.number().int().min(0).max(10_000).optional(),
};

export const createPortfolioSchema = envelope(z.object(fields).strict());

export const updatePortfolioSchema = envelope(
  z.object({
    title: fields.title.optional(),
    description: fields.description,
    category: fields.category,
    mediaAssetId: fields.mediaAssetId.optional(),
    status: fields.status,
    sortOrder: fields.sortOrder,
  }).strict().refine((body) => Object.keys(body).length > 0, 'Provide at least one field.'),
  z.object({ id: z.string().cuid() }),
);

export const portfolioIdSchema = envelope(
  z.unknown().optional(),
  z.object({ id: z.string().cuid() }),
);
