import { z } from 'zod';
import { MARKETPLACE_CATEGORIES } from '../../shared/constants/category.constants.js';

const empty = z.object({}).strict();
const envelope = (query) => z.object({
  body: z.unknown().optional(),
  params: empty,
  query,
});

export const discoverSchema = envelope(z.object({
  limit: z.coerce.number().int().min(1).max(12).default(4),
}).strict());

export const searchSchema = envelope(z.object({
  type: z.enum(['all', 'creators', 'businesses', 'campaigns', 'showcase']).default('all'),
  q: z.string().trim().max(100).default(''),
  category: z.enum(MARKETPLACE_CATEGORIES).optional(),
  location: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(30).default(12),
  sort: z.enum(['relevant', 'newest', 'rating']).default('relevant'),
}).strict());
