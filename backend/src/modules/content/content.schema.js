import { z } from 'zod';

const empty = z.object({}).strict();
const id = z.string().trim().min(1).max(100);
const authorType = z.enum(['CREATOR', 'BUSINESS']);
const postStatus = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
const postType = z.enum(['ORIGINAL', 'PORTFOLIO', 'CAMPAIGN', 'COLLABORATION', 'BRAND_STORY', 'STORY']);
const envelope = (body = empty, params = empty, query = empty) => z.object({ body, params, query });

const media = z.object({
  assetId: id,
  mediaType: z.enum(['IMAGE', 'VIDEO']),
  thumbnailAssetId: id.optional(),
  altText: z.string().trim().max(300).optional(),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
  durationMs: z.number().int().positive().max(86_400_000).optional(),
}).strict();

const storyStyle = z.object({
  background: z.enum(['ocean', 'sunset', 'berry', 'mint', 'midnight', 'sunrise']),
  textColor: z.enum(['#ffffff', '#111111', '#ff76bd', '#bbf7d0']),
  fontSize: z.enum(['sm', 'md', 'lg']),
  textAlign: z.enum(['left', 'center', 'right']),
  x: z.number().min(5).max(95),
  y: z.number().min(5).max(95),
}).strict();

const storyAudio = z.object({
  assetId: id,
  title: z.string().trim().min(1).max(120),
  artist: z.string().trim().max(120).optional(),
  startMs: z.number().int().min(0).max(86_400_000).default(0),
  volume: z.number().min(0).max(1).default(0.7),
  rightsConfirmed: z.literal(true),
}).strict();

const postFields = {
  authorType,
  postType: postType.default('ORIGINAL'),
  title: z.string().trim().min(2).max(140).optional(),
  caption: z.string().trim().min(1).max(2200),
  storyStyle: storyStyle.optional(),
  storyAudio: storyAudio.optional(),
  category: z.string().trim().min(2).max(80).optional(),
  visibility: z.enum(['PUBLIC', 'FOLLOWERS']).default('PUBLIC'),
  campaignId: id.optional(),
  portfolioItemId: id.optional(),
  collaborationId: id.optional(),
  paidPartnership: z.boolean().default(false),
  partnerCreatorId: id.optional(),
  partnerBusinessId: id.optional(),
  media: z.array(media).max(10).default([]),
};

export const contentFeedSchema = envelope(z.unknown().optional(), empty, z.object({
  mode: z.enum(['for_you', 'following']).default('for_you'),
  section: z.enum(['featured', 'trending', 'latest', 'recommended', 'following']).optional(),
  category: z.string().trim().max(80).optional(),
  authorType: authorType.optional(),
  postType: postType.optional(),
  mediaType: z.enum(['IMAGE', 'VIDEO']).optional(),
  q: z.string().trim().max(120).optional(),
  cursor: id.optional(),
  limit: z.coerce.number().int().min(1).max(30).default(12),
}).strict());

export const contentIdSchema = envelope(z.unknown().optional(), z.object({ id }));

export const channelPostsSchema = envelope(z.unknown().optional(), z.object({
  authorType: z.enum(['creator', 'business']).transform((value) => value.toUpperCase()),
  id,
}), z.object({ cursor: id.optional(), limit: z.coerce.number().int().min(1).max(30).default(12) }).strict());

export const mineSchema = envelope(z.unknown().optional(), empty, z.object({
  authorType,
  status: postStatus.optional(),
  postType: postType.optional(),
  cursor: id.optional(),
  limit: z.coerce.number().int().min(1).max(30).default(20),
}).strict());

export const createContentSchema = envelope(z.object({
  ...postFields,
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
}).strict().superRefine((body, context) => {
  if (body.storyAudio && body.postType !== 'STORY') {
    context.addIssue({ code: 'custom', path: ['storyAudio'], message: 'Audio tracks can only be attached to stories.' });
  }
}));

export const updateContentSchema = envelope(z.object({
  postType: postType.optional(),
  title: z.string().trim().min(2).max(140).nullable().optional(),
  caption: z.string().trim().min(1).max(2200).optional(),
  storyStyle: storyStyle.nullable().optional(),
  storyAudio: storyAudio.nullable().optional(),
  category: z.string().trim().min(2).max(80).nullable().optional(),
  visibility: z.enum(['PUBLIC', 'FOLLOWERS']).optional(),
  campaignId: id.nullable().optional(),
  portfolioItemId: id.nullable().optional(),
  collaborationId: id.nullable().optional(),
  paidPartnership: z.boolean().optional(),
  partnerCreatorId: id.nullable().optional(),
  partnerBusinessId: id.nullable().optional(),
  media: z.array(media).max(10).optional(),
}).strict().refine((body) => Object.keys(body).length > 0, 'Submit at least one change.'), z.object({ id }));
