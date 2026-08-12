import { z } from 'zod';
const range = z.enum(['1D', '7D', '1M', '3M', '1Y', 'ALL']).default('1M');
const envelope = ({
  body = z.object({}).strict().optional().default({}),
  params = z.object({}).passthrough(),
  query = z.object({}).passthrough(),
}) => z.object({ body, params, query });
export const analyticsQuerySchema = envelope({ query: z.object({ range, role: z.enum(['creator', 'business']).optional() }).strict() });
export const trackEventSchema = envelope({ body: z.object({
  name: z.string().trim().min(2).max(100),
  sessionId: z.string().trim().max(120).optional(),
  resourceType: z.string().trim().max(80).optional(),
  resourceId: z.string().trim().max(120).optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
}).strict() });
export const campaignReportSchema = envelope({ params: z.object({ campaignId: z.string().cuid() }) });
