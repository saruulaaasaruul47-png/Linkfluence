import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';

export const socialAccountInclude = {
  stats: { orderBy: { capturedAt: 'desc' }, take: 1 },
  mediaItems: {
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: 12,
    include: { stats: { orderBy: { capturedAt: 'desc' }, take: 1 } },
  },
};

const ownerData = (channel) => channel.type === 'BUSINESS'
  ? { businessId: channel.id }
  : { creatorId: channel.id };

const ownerWhere = (channel) => channel.type === 'BUSINESS'
  ? { businessId: channel.id }
  : { creatorId: channel.id };

const ownerPlatformWhere = (channel, platform) => channel.type === 'BUSINESS'
  ? { businessId_platform: { businessId: channel.id, platform } }
  : { creatorId_platform: { creatorId: channel.id, platform } };

async function saveMedia(tx, socialAccountId, mediaItems = []) {
  for (const item of mediaItems.slice(0, 25)) {
    const metrics = item.metrics || null;
    const media = await tx.socialMediaItem.upsert({
      where: {
        socialAccountId_externalMediaId: { socialAccountId, externalMediaId: item.externalMediaId },
      },
      create: {
        socialAccountId,
        externalMediaId: item.externalMediaId,
        mediaType: item.mediaType,
        caption: item.caption || null,
        permalink: item.permalink || null,
        thumbnailUrl: item.thumbnailUrl || null,
        mediaUrl: item.mediaUrl || null,
        publishedAt: item.publishedAt || null,
        lastSyncedAt: new Date(),
      },
      update: {
        mediaType: item.mediaType,
        caption: item.caption || null,
        permalink: item.permalink || null,
        thumbnailUrl: item.thumbnailUrl || null,
        mediaUrl: item.mediaUrl || null,
        publishedAt: item.publishedAt || null,
        lastSyncedAt: new Date(),
      },
    });
    if (metrics) {
      await tx.socialMediaStatSnapshot.create({ data: { mediaItemId: media.id, ...metrics } });
    }
  }
}

export const socialRepository = {
  async findChannel(userId, channelType, db = prisma) {
    if (channelType === 'BUSINESS') {
      const profile = await db.businessProfile.findUnique({
        where: { userId },
        select: { id: true, userId: true },
      });
      return profile ? { ...profile, type: 'BUSINESS' } : null;
    }
    const profile = await db.creatorProfile.findUnique({
      where: { userId },
      select: { id: true, userId: true },
    });
    return profile ? { ...profile, type: 'CREATOR' } : null;
  },

  findCreator(userId, db = prisma) {
    return db.creatorProfile.findUnique({
      where: { userId },
      select: { id: true, userId: true },
    });
  },

  async cleanupOAuthStates(userId, provider) {
    await prisma.socialOAuthState.deleteMany({
      where: {
        userId,
        provider,
        OR: [{ expiresAt: { lte: new Date() } }, { consumedAt: { not: null } }],
      },
    });
  },

  createOAuthState(data) {
    return prisma.socialOAuthState.create({ data });
  },

  findOAuthState(tokenHash) {
    return prisma.socialOAuthState.findUnique({
      where: { tokenHash },
      include: { resultAccount: { include: socialAccountInclude } },
    });
  },

  savePendingSelection(id, data) {
    return prisma.socialOAuthState.update({ where: { id }, data });
  },

  findSelectionState(selectionTokenHash) {
    return prisma.socialOAuthState.findUnique({
      where: { selectionTokenHash },
      include: { resultAccount: { include: socialAccountInclude } },
    });
  },

  list(channel) {
    return prisma.socialAccount.findMany({
      where: { ...ownerWhere(channel), syncStatus: { not: 'DISCONNECTED' } },
      include: socialAccountInclude,
      orderBy: [{ verificationStatus: 'desc' }, { platform: 'asc' }],
    });
  },

  findOwned(id, channel) {
    return prisma.socialAccount.findFirst({
      where: { id, ...ownerWhere(channel), syncStatus: { not: 'DISCONNECTED' } },
      include: socialAccountInclude,
    });
  },

  createManual(channel, data) {
    return prisma.socialAccount.create({
      data: { ...ownerData(channel), ...data },
      include: socialAccountInclude,
    });
  },

  updateManual(id, channel, data) {
    return prisma.socialAccount.update({
      where: { id, ...ownerWhere(channel), syncStatus: 'MANUAL' },
      data,
      include: socialAccountInclude,
    });
  },

  findWithOwner(id) {
    return prisma.socialAccount.findUnique({
      where: { id },
      include: {
        ...socialAccountInclude,
        creator: { select: { userId: true } },
        business: { select: { userId: true } },
      },
    });
  },

  async completeConnection({ stateId, channel, platform, account, stat, mediaItems }) {
    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.socialOAuthState.updateMany({
        where: { id: stateId, consumedAt: null, expiresAt: { gt: new Date() } },
        data: {
          consumedAt: new Date(),
          accessTokenEncrypted: null,
          refreshTokenEncrypted: null,
          candidates: Prisma.DbNull,
          selectionTokenHash: null,
        },
      });
      if (claimed.count !== 1) {
        const state = await tx.socialOAuthState.findUnique({
          where: { id: stateId },
          select: { resultAccountId: true },
        });
        return { accountId: state?.resultAccountId || null, idempotent: true };
      }

      const saved = await tx.socialAccount.upsert({
        where: ownerPlatformWhere(channel, platform),
        create: { ...ownerData(channel), platform, ...account },
        update: { ...account, creatorId: channel.type === 'CREATOR' ? channel.id : null, businessId: channel.type === 'BUSINESS' ? channel.id : null },
      });
      await tx.socialStat.create({ data: { socialAccountId: saved.id, ...stat } });
      await saveMedia(tx, saved.id, mediaItems);
      await tx.socialOAuthState.update({
        where: { id: stateId },
        data: { resultAccountId: saved.id },
      });
      return { accountId: saved.id, idempotent: false };
    });
    return {
      account: result.accountId
        ? await prisma.socialAccount.findUnique({ where: { id: result.accountId }, include: socialAccountInclude })
        : null,
      idempotent: result.idempotent,
    };
  },

  async claimSync(id) {
    const result = await prisma.socialAccount.updateMany({
      where: { id, syncStatus: { notIn: ['SYNCING', 'MANUAL', 'DISCONNECTED'] } },
      data: { syncStatus: 'SYNCING', syncError: null },
    });
    return result.count === 1;
  },

  async completeSync(id, account, stat, mediaItems) {
    await prisma.$transaction(async (tx) => {
      await tx.socialAccount.update({ where: { id }, data: account });
      await tx.socialStat.create({ data: { socialAccountId: id, ...stat } });
      await saveMedia(tx, id, mediaItems);
    });
    return prisma.socialAccount.findUnique({ where: { id }, include: socialAccountInclude });
  },

  failSync(id, syncStatus, message) {
    return prisma.socialAccount.update({
      where: { id },
      data: { syncStatus, syncError: message.slice(0, 1000) },
    });
  },

  findStaleConnected(cutoff, limit) {
    return prisma.socialAccount.findMany({
      where: {
        syncStatus: { in: ['CONNECTED', 'HEALTHY', 'ERROR', 'STALE'] },
        accessTokenEncrypted: { not: null },
        OR: [{ lastSyncAt: null }, { lastSyncAt: { lte: cutoff } }],
      },
      include: {
        ...socialAccountInclude,
        creator: { select: { userId: true } },
        business: { select: { userId: true } },
      },
      orderBy: [{ lastSyncAt: 'asc' }, { id: 'asc' }],
      take: limit,
    });
  },

  deleteOwned(id, channel) {
    return prisma.socialAccount.deleteMany({ where: { id, ...ownerWhere(channel) } });
  },

  async createWebhookEvent(data) {
    try {
      const event = await prisma.socialWebhookEvent.create({ data });
      return { event, duplicate: false };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { event: null, duplicate: true };
      }
      throw error;
    }
  },

  markWebhookAccountsStale(externalIds) {
    if (!externalIds.length) return Promise.resolve({ count: 0 });
    return prisma.socialAccount.updateMany({
      where: {
        syncStatus: { in: ['CONNECTED', 'HEALTHY', 'ERROR', 'STALE'] },
        OR: [
          { providerAccountId: { in: externalIds } },
          { providerPageId: { in: externalIds } },
        ],
      },
      data: { syncStatus: 'STALE' },
    });
  },

  completeWebhookEvent(id) {
    return prisma.socialWebhookEvent.update({ where: { id }, data: { processedAt: new Date() } });
  },
};
