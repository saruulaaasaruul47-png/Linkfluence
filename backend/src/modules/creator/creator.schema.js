import { z } from 'zod';
import { canonicalCategory } from '../../shared/constants/category.constants.js';

const optionalText = (max) => z.string().trim().max(max).optional();
const optionalUrl = z.string().trim().max(500)
  .transform((value) => value && !/^https?:\/\//i.test(value) ? `https://${value}` : value)
  .refine((value) => !value || /^https?:\/\/[^.\s]+\..+/i.test(value), 'Enter a valid HTTP or HTTPS URL.')
  .optional();
const optionalRate = z.union([z.string().trim().max(40), z.number().nonnegative()]).optional();
const availability = z.enum([
  'AVAILABLE_NOW',
  'AVAILABLE_THIS_MONTH',
  'LIMITED',
  'NOT_ACCEPTING',
  // Backward-compatible UI values are normalized by the service.
  'Available now',
  'Available this month',
  'Limited availability',
  'Not accepting work',
]);
const currency = z.enum(['MNT', 'USD', 'EUR', 'KRW', 'JPY', 'CNY']);
const shortList = z.array(z.string().trim().min(1).max(60)).max(20);

const creatorBody = z.object({
  channelName: z.string().trim().min(2).max(80).optional(),
  name: z.string().trim().min(2).max(80).optional(),
  username: z.string().trim().min(3).max(30)
    .transform((value) => value.replace(/^@/, '').toLowerCase())
    .pipe(z.string().regex(/^[a-z0-9_]+$/, 'Use only letters, numbers and underscores.'))
    .optional(),
  bio: optionalText(500),
  niche: z.string().trim()
    .transform((value) => canonicalCategory(value) || value)
    .refine((value) => Boolean(canonicalCategory(value)), 'Choose a supported marketplace category.')
    .optional(),
  categories: z.array(z.string().trim()
    .transform((value) => canonicalCategory(value) || value)
    .refine((value) => Boolean(canonicalCategory(value)), 'Choose a supported marketplace category.'))
    .max(8)
    .optional(),
  skills: shortList.optional(),
  languages: shortList.optional(),
  audience: optionalText(120),
  format: optionalText(120),
  location: optionalText(120),
  language: optionalText(80),
  instagram: optionalUrl,
  facebook: optionalUrl,
  tiktok: optionalUrl,
  youtube: optionalUrl,
  manualLink: optionalUrl,
  postRate: optionalRate,
  storyRate: optionalRate,
  reelRate: optionalRate,
  rate: optionalRate,
  startingRate: optionalRate,
  currency: currency.optional(),
  publicRates: z.boolean().optional(),
  availability: availability.optional(),
  availableForWork: z.boolean().optional(),
  avatar: optionalText(500),
  cover: optionalText(500),
  avatarMediaId: z.string().cuid().optional(),
  coverMediaId: z.string().cuid().optional(),
  sampleMediaId: z.string().cuid().optional(),
  workTitle: optionalText(120),
  workCategory: optionalText(80),
  workDescription: optionalText(500),
}).strict();

const envelope = (body) => z.object({
  body,
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

export const createCreatorSchema = envelope(
  creatorBody.refine(
    (body) => Boolean(body.channelName || body.name),
    { path: ['channelName'], message: 'Channel name is required.' },
  ).refine(
    (body) => Boolean(body.username),
    { path: ['username'], message: 'Username is required.' },
  ),
);

export const updateCreatorSchema = envelope(
  creatorBody.refine((body) => Object.keys(body).length > 0, 'Provide at least one profile field.'),
);
