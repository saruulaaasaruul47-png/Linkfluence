import { env } from '../../config/env.js';

const decimal = (value) => value == null ? null : Number(value);

export function toSocialAccount(account) {
  if (!account) return null;
  const latest = account.stats?.[0] || null;
  const staleAt = account.lastSyncAt
    ? new Date(account.lastSyncAt.getTime() + env.socialSyncStaleHours * 60 * 60 * 1000)
    : null;
  const isStale = Boolean(
    account.syncStatus !== 'MANUAL'
      && (!account.lastSyncAt || staleAt <= new Date()),
  );
  const syncStatus = isStale && ['HEALTHY', 'CONNECTED'].includes(account.syncStatus)
    ? 'STALE'
    : account.syncStatus;

  return {
    id: account.id,
    platform: account.platform,
    handle: account.handle,
    profileUrl: account.profileUrl || '',
    providerAccountId: account.providerAccountId || null,
    channelType: account.businessId ? 'BUSINESS' : 'CREATOR',
    followerCount: account.followerCount,
    engagementRate: decimal(account.engagementRate),
    verificationStatus: account.verificationStatus,
    verified: account.verificationStatus === 'VERIFIED',
    connectionType: account.syncStatus === 'MANUAL' ? 'MANUAL' : 'API',
    syncStatus,
    syncError: account.syncError || null,
    isStale,
    lastSyncAt: account.lastSyncAt || null,
    staleAt,
    connectedAt: account.connectedAt || null,
    latestStats: latest ? {
      followerCount: latest.followerCount,
      followingCount: latest.followingCount,
      mediaCount: latest.mediaCount,
      reach: latest.reach,
      impressions: latest.impressions,
      engagementCount: latest.engagementCount,
      engagementRate: decimal(latest.engagementRate),
      capturedAt: latest.capturedAt,
    } : null,
    recentMedia: (account.mediaItems || []).map((item) => ({
      id: item.id,
      externalMediaId: item.externalMediaId,
      mediaType: item.mediaType,
      caption: item.caption || '',
      permalink: item.permalink || '',
      thumbnailUrl: item.thumbnailUrl || '',
      mediaUrl: item.mediaUrl || '',
      publishedAt: item.publishedAt || null,
      metrics: item.stats?.[0] ? {
        likeCount: item.stats[0].likeCount,
        commentCount: item.stats[0].commentCount,
        savedCount: item.stats[0].savedCount,
        shareCount: item.stats[0].shareCount,
        reach: item.stats[0].reach,
        impressions: item.stats[0].impressions,
        plays: item.stats[0].plays,
        capturedAt: item.stats[0].capturedAt,
      } : null,
    })),
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}
