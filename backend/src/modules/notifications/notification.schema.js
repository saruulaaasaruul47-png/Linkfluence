import { z } from 'zod';
const envelope = ({ body = z.object({}).passthrough().optional().default({}), params = z.object({}).passthrough(), query = z.object({}).passthrough() } = {}) => z.object({
  body,
  params,
  query,
});
export const notificationListSchema = envelope({ query: z.object({
  unread: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
}).strict() });
export const notificationIdSchema = envelope({ params: z.object({ id: z.string().cuid() }) });
export const notificationPreferenceSchema = envelope({ body: z.object({
  emailEnabled: z.boolean().optional(),
  offerEmail: z.boolean().optional(),
  proposalEmail: z.boolean().optional(),
  contractEmail: z.boolean().optional(),
  paymentEmail: z.boolean().optional(),
  deliverableEmail: z.boolean().optional(),
  proofEmail: z.boolean().optional(),
  payoutEmail: z.boolean().optional(),
  deadlineEmail: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Choose at least one preference.') });
