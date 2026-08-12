import { z } from 'zod';

const id = z.string().cuid();
const envelope = ({ body = z.object({}).strict().optional().default({}), params = z.object({}).passthrough() } = {}) =>
  z.object({ body, params, query: z.object({}).passthrough() });

export const collaborationDisputeSchema = envelope({ params: z.object({ collaborationId: id }) });
export const openDisputeSchema = envelope({
  params: z.object({ collaborationId: id }),
  body: z.object({
    reason: z.string().trim().min(20).max(3000),
    priority: z.coerce.number().int().min(0).max(10).default(5),
    evidence: z.array(z.object({
      mediaAssetId: id.optional(),
      url: z.string().trim().min(1).max(2048).optional(),
      label: z.string().trim().min(2).max(160),
    }).strict().refine((item) => item.mediaAssetId || item.url, 'Evidence file is required.')).max(10).default([]),
  }).strict(),
});
export const addEvidenceSchema = envelope({
  params: z.object({ id }),
  body: z.object({
    mediaAssetId: id.optional(),
    url: z.string().trim().min(1).max(2048).optional(),
    label: z.string().trim().min(2).max(160),
    note: z.string().trim().max(1000).optional(),
  }).strict().refine((item) => item.mediaAssetId || item.url, 'Evidence file is required.'),
});

