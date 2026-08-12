import { prisma } from '../../config/database.js';

const includeProfile = {
  socialAccounts: {
    include: { stats: { orderBy: { capturedAt: 'desc' }, take: 1 } },
    orderBy: { platform: 'asc' },
  },
  portfolioItems: {
    where: { deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  },
  user: {
    select: {
      id: true,
      avatarUrl: true,
    },
  },
};

export const creatorRepository = {
  findByUserId(userId, db = prisma) {
    return db.creatorProfile.findUnique({ where: { userId }, include: includeProfile });
  },

  findBySlug(slug, db = prisma) {
    return db.creatorProfile.findUnique({ where: { slug }, select: { id: true, userId: true } });
  },

  async create(userId, profileData, socialAccounts, portfolioItem) {
    await prisma.$transaction(async (tx) => {
      const profile = await tx.creatorProfile.create({ data: { userId, ...profileData } });
      if (socialAccounts.length) {
        await tx.socialAccount.createMany({
          data: socialAccounts.map((account) => ({ ...account, creatorId: profile.id })),
          skipDuplicates: true,
        });
      }
      if (portfolioItem) {
        await tx.portfolioItem.create({
          data: { ...portfolioItem, creatorId: profile.id },
        });
      }

      const user = await tx.user.findUnique({ where: { id: userId }, select: { roles: true } });
      await tx.user.update({
        where: { id: userId },
        data: { roles: Array.from(new Set([...user.roles, 'CREATOR'])) },
      });
    });
    const [profile, user] = await Promise.all([
      prisma.creatorProfile.findUnique({ where: { userId }, include: includeProfile }),
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          creatorProfile: { select: { id: true } },
          businessProfile: { select: { id: true } },
        },
      }),
    ]);
    return {
      profile,
      user,
    };
  },

  async update(userId, profileData, socialAccounts) {
    await prisma.$transaction(async (tx) => {
      const current = await tx.creatorProfile.findUnique({ where: { userId }, select: { id: true } });
      await tx.creatorProfile.update({ where: { userId }, data: profileData });
      if (socialAccounts) {
        // Profile edits may replace manual links, but must never delete OAuth tokens or verified stats.
        await tx.socialAccount.deleteMany({ where: { creatorId: current.id, syncStatus: 'MANUAL' } });
        if (socialAccounts.length) {
          await tx.socialAccount.createMany({
            data: socialAccounts.map((account) => ({ ...account, creatorId: current.id })),
            skipDuplicates: true,
          });
        }
      }
    });
    return prisma.creatorProfile.findUnique({ where: { userId }, include: includeProfile });
  },

  async remove(userId) {
    return prisma.$transaction(async (tx) => {
      await tx.creatorProfile.delete({ where: { userId } });
      const user = await tx.user.findUnique({ where: { id: userId }, select: { roles: true } });
      return tx.user.update({
        where: { id: userId },
        data: { roles: user.roles.filter((role) => role !== 'CREATOR') },
        include: {
          creatorProfile: { select: { id: true } },
          businessProfile: { select: { id: true } },
        },
      });
    });
  },
};
