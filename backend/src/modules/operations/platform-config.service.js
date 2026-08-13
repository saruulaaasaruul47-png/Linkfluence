import { createHash } from 'node:crypto';
import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';
import { redisCache } from '../../infrastructure/cache/redis-cache.js';

export const PLATFORM_SETTING_DEFINITIONS = Object.freeze({
  maintenance: { defaultValue: false, description: 'Temporarily pauses non-admin product mutations.' },
  creatorApplications: { defaultValue: true, description: 'Allows creator channel onboarding.' },
  businessApplications: { defaultValue: true, description: 'Allows business channel onboarding.' },
  manualReview: { defaultValue: false, description: 'Requires manual review before public campaign publication.' },
  publicPricing: { defaultValue: true, description: 'Shows creator starting prices in public discovery.' },
  commission: { defaultValue: 10, description: 'Platform commission percentage.' },
  barterPlatformFee: { defaultValue: 30000, description: 'Fixed platform service fee for barter collaborations in MNT.' },
  minimumTopUp: { defaultValue: 10000, description: 'Minimum business wallet top-up amount in MNT.' },
  minimumPayout: { defaultValue: 100000, description: 'Minimum payout amount in MNT.' },
  refundPolicy: { defaultValue: { beforeWorkPercent: 100, afterWorkPercent: 0 }, description: 'Refund percentage before and after collaboration work starts.' },
  settlement: { defaultValue: 'weekly', description: 'Default settlement schedule.' },
  require2fa: { defaultValue: false, description: 'Requires admin two-factor authentication when an identity provider supports it.' },
  newDeviceAlerts: { defaultValue: true, description: 'Enables new-device security notifications.' },
  outboxBacklogThreshold: { defaultValue: 1000, description: 'Maximum ready-check outbox backlog.' },
});

export const FEATURE_FLAG_KEYS = Object.freeze([
  'creator_onboarding',
  'business_onboarding',
  'campaign_publishing',
  'content_publishing',
]);

const cache = new Map();
const CACHE_MS = 15_000;

const cacheRead = (key) => {
  const hit = cache.get(key);
  return hit && hit.expiresAt > Date.now() ? hit.value : undefined;
};
const cacheWrite = (key, value) => cache.set(key, { value, expiresAt: Date.now() + CACHE_MS });

export function clearPlatformConfigCache() {
  cache.clear();
  void redisCache.del(...Object.keys(PLATFORM_SETTING_DEFINITIONS).map((key) => `platform:setting:${key}`), ...FEATURE_FLAG_KEYS.map((key) => `platform:flag:${key}`));
}

export async function getSetting(key, db = prisma) {
  if (!Object.hasOwn(PLATFORM_SETTING_DEFINITIONS, key)) return undefined;
  const cached = cacheRead(`setting:${key}`);
  if (cached !== undefined) return cached;
  const distributed = await redisCache.get(`platform:setting:${key}`);
  if (distributed !== undefined) { cacheWrite(`setting:${key}`, distributed); return distributed; }
  const row = await db.platformSetting.findUnique({ where: { key }, select: { value: true } });
  const value = row?.value ?? PLATFORM_SETTING_DEFINITIONS[key].defaultValue;
  cacheWrite(`setting:${key}`, value);
  void redisCache.set(`platform:setting:${key}`, value, 30);
  return value;
}

export async function isFeatureEnabled(key, actor = null, db = prisma) {
  const cached = cacheRead(`flag:${key}`);
  const distributed = cached === undefined ? await redisCache.get(`platform:flag:${key}`) : undefined;
  const flag = cached !== undefined
    ? cached
    : distributed !== undefined ? distributed : await db.featureFlag.findUnique({ where: { key }, select: { enabled: true, rolloutPercentage: true, allowedRoles: true } });
  if (cached === undefined) cacheWrite(`flag:${key}`, flag || null);
  if (cached === undefined && distributed === undefined) void redisCache.set(`platform:flag:${key}`, flag || null, 30);
  if (!flag) return true;
  if (!flag.enabled) return false;
  let actorRoles = actor?.roles || [];
  if (flag.allowedRoles.length && actor?.id && !actorRoles.length) {
    actorRoles = (await db.user.findUnique({ where: { id: actor.id }, select: { roles: true } }))?.roles || [];
  }
  if (flag.allowedRoles.length && !actorRoles.some((role) => flag.allowedRoles.includes(role))) return false;
  if (flag.rolloutPercentage >= 100) return true;
  if (!actor?.id || flag.rolloutPercentage <= 0) return false;
  const bucket = Number.parseInt(createHash('sha256').update(`${key}:${actor.id}`).digest('hex').slice(0, 8), 16) % 100;
  return bucket < flag.rolloutPercentage;
}

export async function assertFeatureEnabled(key, actor = null, db = prisma) {
  if (!(await isFeatureEnabled(key, actor, db))) {
    throw new AppError('This platform capability is currently unavailable.', 503, 'FEATURE_DISABLED', { feature: key });
  }
}

export async function assertSettingEnabled(key, errorCode, message, db = prisma) {
  if (!(await getSetting(key, db))) throw new AppError(message, 503, errorCode);
}
