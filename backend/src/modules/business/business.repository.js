import { prisma } from '../../config/database.js';
import { payerTrustSelect } from '../payments/payer-trust.js';

const includeProfile = {
  user: { select: { id: true, avatarUrl: true } },
  collaborations: { select: payerTrustSelect },
  socialAccounts: {
    include: { stats: { orderBy: { capturedAt: 'desc' }, take: 1 } },
    orderBy: { platform: 'asc' },
  },
};

export const businessRepository = {
  findByUserId(userId, db = prisma) {
    return db.businessProfile.findUnique({ where: { userId }, include: includeProfile });
  },

  findBySlug(slug, db = prisma) {
    return db.businessProfile.findUnique({ where: { slug }, select: { id: true, userId: true } });
  },

  async create(userId, profileData) {
    return prisma.$transaction(async (tx) => {
      await tx.businessProfile.create({ data: { userId, ...profileData } });
      const current = await tx.user.findUnique({ where: { id: userId }, select: { roles: true } });
      const user = await tx.user.update({
        where: { id: userId },
        data: { roles: Array.from(new Set([...current.roles, 'BUSINESS'])) },
        include: {
          creatorProfile: { select: { id: true } },
          businessProfile: { select: { id: true } },
        },
      });
      return {
        profile: await tx.businessProfile.findUnique({ where: { userId }, include: includeProfile }),
        user,
      };
    });
  },

  update(userId, profileData) {
    return prisma.businessProfile.update({
      where: { userId },
      data: profileData,
      include: includeProfile,
    });
  },

  async remove(userId) {
    return prisma.$transaction(async (tx) => {
      await tx.businessProfile.delete({ where: { userId } });
      const current = await tx.user.findUnique({ where: { id: userId }, select: { roles: true } });
      return tx.user.update({
        where: { id: userId },
        data: { roles: current.roles.filter((role) => role !== 'BUSINESS') },
        include: {
          creatorProfile: { select: { id: true } },
          businessProfile: { select: { id: true } },
        },
      });
    });
  },
};
