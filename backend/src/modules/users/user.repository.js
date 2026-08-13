import { prisma } from '../../config/database.js';

const profileIncludes = {
  creatorProfile: { select: { id: true } },
  businessProfile: { select: { id: true } },
};

export const userRepository = {
  findById(id, db = prisma) {
    return db.user.findUnique({ where: { id }, include: profileIncludes });
  },

  findByUsername(username, db = prisma) {
    return db.user.findUnique({ where: { username }, select: { id: true } });
  },

  exportById(id, db = prisma) {
    return db.user.findUnique({
      where: { id },
      include: {
        creatorProfile: {
          include: {
            socialAccounts: { select: { id: true, platform: true, handle: true, profileUrl: true, followerCount: true, engagementRate: true, verificationStatus: true, syncStatus: true, lastSyncAt: true, createdAt: true } },
            portfolioItems: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
          },
        },
        businessProfile: {
          include: {
            socialAccounts: { select: { id: true, platform: true, handle: true, profileUrl: true, followerCount: true, engagementRate: true, verificationStatus: true, syncStatus: true, lastSyncAt: true, createdAt: true } },
            campaigns: { orderBy: { createdAt: 'desc' } },
          },
        },
        collections: { include: { items: true }, orderBy: { createdAt: 'desc' } },
        following: { orderBy: { createdAt: 'desc' } },
        savedItems: { orderBy: { createdAt: 'desc' } },
        reviewsWritten: { orderBy: { createdAt: 'desc' } },
        reviewsReceived: { orderBy: { createdAt: 'desc' } },
        notifications: { orderBy: { createdAt: 'desc' } },
        conversationMembers: { select: { conversationId: true, joinedAt: true, lastReadAt: true } },
      },
    });
  },

  update(id, data, db = prisma) {
    return db.user.update({ where: { id }, data, include: profileIncludes });
  },

  async updatePasswordAndRevokeSessions(id, passwordHash) {
    return prisma.$transaction(async (tx) => {
      const user = await this.update(id, {
        passwordHash,
        sessionVersion: { increment: 1 },
      }, tx);
      await tx.authToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return user;
    });
  },

  async softDeleteAndRevokeSessions(id) {
    return prisma.$transaction(async (tx) => {
      const user = await this.update(id, {
        deletedAt: new Date(),
        status: 'BANNED',
        sessionVersion: { increment: 1 },
      }, tx);
      await tx.authToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return user;
    });
  },
};
