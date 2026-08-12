import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { socialRepository } from './social.repository.js';

function signatureMatches(rawBody, header) {
  if (!env.metaAppSecret || !header?.startsWith('sha256=')) return false;
  const expected = Buffer.from(createHmac('sha256', env.metaAppSecret).update(rawBody).digest('hex'), 'utf8');
  const actual = Buffer.from(header.slice(7), 'utf8');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function externalIds(payload) {
  const ids = new Set();
  for (const entry of Array.isArray(payload?.entry) ? payload.entry : []) {
    if (entry?.id) ids.add(String(entry.id));
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      if (change?.value?.page_id) ids.add(String(change.value.page_id));
      if (change?.value?.instagram_business_account_id) ids.add(String(change.value.instagram_business_account_id));
    }
  }
  return [...ids];
}

export const metaWebhookService = {
  verify(query) {
    if (!env.metaWebhookVerifyToken || query['hub.verify_token'] !== env.metaWebhookVerifyToken) {
      throw new AppError('Meta webhook verification failed.', 403, 'META_WEBHOOK_VERIFICATION_FAILED');
    }
    if (query['hub.mode'] !== 'subscribe' || !query['hub.challenge']) {
      throw new AppError('Meta webhook verification parameters are invalid.', 400, 'META_WEBHOOK_VERIFICATION_INVALID');
    }
    return String(query['hub.challenge']);
  },

  async receive(rawBody, signature) {
    if (!Buffer.isBuffer(rawBody) || !signatureMatches(rawBody, signature)) {
      throw new AppError('Meta webhook signature is invalid.', 401, 'INVALID_WEBHOOK_SIGNATURE');
    }
    let payload;
    try { payload = JSON.parse(rawBody.toString('utf8')); }
    catch { throw new AppError('Meta webhook payload is invalid.', 400, 'INVALID_WEBHOOK_PAYLOAD'); }
    const hash = createHash('sha256').update(rawBody).digest('hex');
    const stored = await socialRepository.createWebhookEvent({
      eventHash: hash,
      provider: 'META',
      objectType: payload.object ? String(payload.object).slice(0, 100) : null,
      entryCount: Array.isArray(payload.entry) ? payload.entry.length : 0,
    });
    if (stored.duplicate) return { duplicate: true, affectedConnections: 0 };
    const affected = await socialRepository.markWebhookAccountsStale(externalIds(payload));
    await socialRepository.completeWebhookEvent(stored.event.id);
    return { duplicate: false, affectedConnections: affected.count };
  },
};
