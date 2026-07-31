import { prisma } from '../../config/database.js';

export const interactionRepository = {
  async state(userId) {
    const [saved, following, recent] = await prisma.$transaction([
      prisma.savedItem.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { targetType: true, targetId: true, createdAt: true },
      }),
      prisma.follow.findMany({
        where: { followerId: userId },
        orderBy: { createdAt: 'desc' },
        select: { targetType: true, targetId: true, createdAt: true },
      }),
      prisma.recentView.findMany({
        where: { userId },
        orderBy: { viewedAt: 'desc' },
        take: 20,
        select: { targetType: true, targetId: true, viewedAt: true },
      }),
    ]);
    return { saved, following, recent };
  },

  save(userId, targetType, targetId) {
    return prisma.savedItem.upsert({
      where: { userId_targetType_targetId: { userId, targetType, targetId } },
      create: { userId, targetType, targetId },
      update: {},
    });
  },

  unsave(userId, targetType, targetId) {
    return prisma.savedItem.deleteMany({ where: { userId, targetType, targetId } });
  },

  follow(userId, targetType, targetId) {
    return prisma.follow.upsert({
      where: {
        followerId_targetType_targetId: {
          followerId: userId,
          targetType,
          targetId,
        },
      },
      create: { followerId: userId, targetType, targetId },
      update: {},
    });
  },

  unfollow(userId, targetType, targetId) {
    return prisma.follow.deleteMany({
      where: { followerId: userId, targetType, targetId },
    });
  },

  recent(userId, targetType, targetId) {
    return prisma.recentView.upsert({
      where: { userId_targetType_targetId: { userId, targetType, targetId } },
      create: { userId, targetType, targetId },
      update: { viewedAt: new Date() },
    });
  },

  share(userId, targetType, targetId, channel) {
    return prisma.shareEvent.create({
      data: { userId, targetType, targetId, channel: channel || null },
    });
  },
};
