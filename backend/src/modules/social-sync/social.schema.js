import { z } from 'zod';

const empty = z.object({}).strict();
const id = z.string().cuid();
const provider = z.enum(['instagram', 'facebook']);
const channelType = z.enum(['CREATOR', 'BUSINESS']);
const manualPlatform = z.enum(['INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'YOUTUBE', 'X', 'OTHER']);
const profileUrl = z.string().trim().max(500)
  .transform((value) => !/^https?:\/\//i.test(value) ? `https://${value}` : value)
  .pipe(z.string().url().refine((value) => /^https?:\/\//i.test(value), 'Use an HTTP or HTTPS profile URL.'));
const envelope = (body = empty, params = empty, query = empty) => z.object({ body, params, query });

export const authorizeSocialSchema = envelope(
  z.unknown().optional(),
  z.object({ provider }),
  z.object({
    redirectTo: z.string().trim().max(300).regex(/^\/(?!\/)/, 'redirectTo must be an application-relative path.').optional(),
    channelType: channelType.optional().default('CREATOR'),
  }).strict(),
);

export const socialCallbackSchema = envelope(
  z.unknown().optional(),
  z.object({ provider }),
  z.object({
    code: z.string().trim().min(3).max(2048).optional(),
    state: z.string().trim().min(32).max(512),
    error: z.string().trim().max(200).optional(),
    error_description: z.string().trim().max(500).optional(),
  }).strict().refine((query) => Boolean(query.code || query.error), 'Authorization code or provider error is required.'),
);

export const socialAccountIdSchema = envelope(
  z.unknown().optional(),
  z.object({ id }),
  z.object({ channelType: channelType.optional() }).strict(),
);
export const listSocialSchema = envelope(z.unknown().optional(), empty, z.object({ channelType: channelType.default('CREATOR') }).strict());
export const selectionOptionsSchema = envelope(z.unknown().optional(), empty, z.object({ selectionToken: z.string().trim().min(32).max(512) }).strict());
export const completeSelectionSchema = envelope(z.object({
  selectionToken: z.string().trim().min(32).max(512),
  externalAccountId: z.string().trim().min(1).max(255),
}).strict());

const manualBody = z.object({
  platform: manualPlatform,
  profileUrl,
  handle: z.string().trim().min(1).max(100).transform((value) => value.replace(/^@/, '')).optional(),
  followerCount: z.coerce.number().int().min(0).max(2_000_000_000).optional(),
  engagementRate: z.coerce.number().min(0).max(100).optional(),
}).strict();

export const createManualSocialSchema = envelope(manualBody, empty, z.object({ channelType: channelType.default('CREATOR') }).strict());
export const updateManualSocialSchema = envelope(
  manualBody.partial().refine((body) => Object.keys(body).length > 0, 'Provide at least one social account field.'),
  z.object({ id }),
  z.object({ channelType: channelType.default('CREATOR') }).strict(),
);
