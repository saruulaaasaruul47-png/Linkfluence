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
      const createdProfile = await tx.businessProfile.findUnique({ where: { userId }, select: { id: true } });
      await tx.businessMember.create({
        data: {
          businessId: createdProfile.id,
          userId,
          role: 'OWNER',
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      });
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

  findUserByEmail(email, db = prisma) {
    return db.user.findUnique({
      where: { email },
      select: { id: true, email: true, displayName: true, avatarUrl: true, status: true },
    });
  },

  findMembership(memberId, db = prisma) {
    return db.businessMember.findUnique({
      where: { id: memberId },
      include: { user: { select: { id: true, email: true, displayName: true, avatarUrl: true } } },
    });
  },

  findManagerMembership(businessId, userId, db = prisma) {
    return db.businessMember.findUnique({
      where: { businessId_userId: { businessId, userId } },
      select: { id: true, role: true, status: true },
    });
  },

  listMembers(businessId, db = prisma) {
    return db.businessMember.findMany({
      where: { businessId },
      include: { user: { select: { id: true, email: true, displayName: true, avatarUrl: true } } },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
  },

  upsertInvitation(businessId, userId, role, invitedBy, db = prisma) {
    return db.businessMember.upsert({
      where: { businessId_userId: { businessId, userId } },
      create: { businessId, userId, role, status: 'INVITED', invitedBy },
      update: { role, status: 'INVITED', invitedBy, joinedAt: null },
      include: { user: { select: { id: true, email: true, displayName: true, avatarUrl: true } } },
    });
  },

  updateMember(memberId, data, db = prisma) {
    return db.businessMember.update({
      where: { id: memberId },
      data,
      include: { user: { select: { id: true, email: true, displayName: true, avatarUrl: true } } },
    });
  },

  deleteMember(memberId, db = prisma) {
    return db.businessMember.delete({ where: { id: memberId } });
  },
};
