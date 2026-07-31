import { z } from 'zod';

const optionalText = (max) => z.string().trim().max(max).optional();
const optionalUrl = z.union([z.string().trim().url(), z.literal('')]).optional();

const businessBody = z.object({
  organization: z.string().trim().min(2).max(120).optional(),
  name: z.string().trim().min(2).max(120).optional(),
  username: z.string().trim().min(3).max(30)
    .transform((value) => value.replace(/^@/, '').toLowerCase())
    .pipe(z.string().regex(/^[a-z0-9_]+$/, 'Use only letters, numbers and underscores.'))
    .optional(),
  description: optionalText(800),
  industry: optionalText(100),
  website: optionalUrl,
  companySize: optionalText(60),
  contactEmail: z.union([z.string().trim().email(), z.literal('')]).optional(),
  location: optionalText(120),
  targetNiche: optionalText(120),
  campaignGoal: optionalText(300),
  monthlyBudget: optionalText(80),
  logo: optionalText(500),
  cover: optionalText(500),
  logoMediaId: z.string().cuid().optional(),
  coverMediaId: z.string().cuid().optional(),
}).strict();

const envelope = (body) => z.object({
  body,
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

export const createBusinessSchema = envelope(
  businessBody.refine(
    (body) => Boolean(body.organization || body.name),
    { path: ['organization'], message: 'Organization name is required.' },
  ).refine(
    (body) => Boolean(body.username),
    { path: ['username'], message: 'Username is required.' },
  ),
);

export const updateBusinessSchema = envelope(
  businessBody.refine((body) => Object.keys(body).length > 0, 'Provide at least one profile field.'),
);
