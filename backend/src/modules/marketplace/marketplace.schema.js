import { z } from 'zod';
import { MARKETPLACE_CATEGORIES } from '../../shared/constants/category.constants.js';

const bool = z.enum(['true', 'false']).transform((value) => value === 'true').optional();
const optionalNumber = z.coerce.number().nonnegative().optional();
const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
};
const envelope = (query, params = z.object({}).passthrough()) => z.object({
  body: z.unknown().optional(),
  params,
  query,
});

export const creatorListSchema = envelope(z.object({
  q: z.string().trim().max(100).optional(),
  category: z.enum(MARKETPLACE_CATEGORIES).optional(),
  location: z.string().trim().max(120).optional(),
  platform: z.enum(['INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'FACEBOOK', 'X', 'OTHER']).optional(),
  minFollowers: optionalNumber,
  minEngagement: optionalNumber,
  minRating: z.coerce.number().min(0).max(5).optional(),
  minPrice: optionalNumber,
  maxPrice: optionalNumber,
  verified: bool,
  available: bool,
  sort: z.enum(['relevant', 'newest', 'rating', 'followers', 'price_low', 'price_high']).default('relevant'),
  ...pagination,
}).strict());

export const businessListSchema = envelope(z.object({
  q: z.string().trim().max(100).optional(),
  industry: z.string().trim().max(100).optional(),
  location: z.string().trim().max(120).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  verified: bool,
  sort: z.enum(['relevant', 'newest', 'rating', 'name']).default('relevant'),
  ...pagination,
}).strict());

export const publicProfileSchema = envelope(
  z.object({}).passthrough(),
  z.object({ id: z.string().trim().min(1).max(80) }),
);

export const categoriesSchema = envelope(z.object({}).strict());
