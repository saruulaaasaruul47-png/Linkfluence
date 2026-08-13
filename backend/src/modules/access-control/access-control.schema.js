import { z } from 'zod';

const key = z.string().trim().regex(/^[A-Z][A-Z0-9_]{2,79}$/, 'Permission key is invalid.');
const id = z.string().trim().min(1).max(100);
const envelope = (params, body = z.object({}).strict()) => z.object({
  params,
  body,
  query: z.object({}).passthrough(),
});

export const userPermissionListSchema = envelope(z.object({ userId: id }).strict());
export const permissionMutationSchema = envelope(
  z.object({ userId: id, permissionKey: key }).strict(),
  z.object({ reason: z.string().trim().min(3).max(500) }).strict(),
);
