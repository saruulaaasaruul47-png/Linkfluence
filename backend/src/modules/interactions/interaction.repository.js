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

  follow(userId, target, db = prisma) {
    return db.$transaction(async (tx) => {
      await tx.follow.upsert({
        where: { followerId_targetType_targetId: { followerId: userId, targetType: target.type, targetId: target.id } },
        create: { followerId: userId, targetType: target.type, targetId: target.id },
        update: {},
      });
      const actor = await tx.user.findUnique({ where: { id: userId }, select: { displayName: true } });
      let notification = null;
      if (target.ownerUserId && target.ownerUserId !== userId) {
        notification = await tx.notification.upsert({
          where: { userId_sourceEventId: { userId: target.ownerUserId, sourceEventId: `follow:${userId}:${target.type}:${target.id}` } },
          create: {
            userId: target.ownerUserId,
            sourceEventId: `follow:${userId}:${target.type}:${target.id}`,
            type: 'FOLLOW',
            title: 'New follower',
            body: `${actor?.displayName || 'Someone'} followed your channel.`,
            href: target.type === 'CREATOR' ? `/creators/${target.id}` : `/businesses/${target.id}`,
            data: { actorId: userId, targetType: target.type, targetId: target.id },
          },
          update: {},
        });
      }
      const followerCount = await tx.follow.count({ where: { targetType: target.type, targetId: target.id } });
      return { followerCount, notification };
    });
  },

  unfollow(userId, targetType, targetId) {
    return prisma.follow.deleteMany({
      where: { followerId: userId, targetType, targetId },
    });
  },

  followerCount(targetType, targetId, db = prisma) {
    return db.follow.count({ where: { targetType, targetId } });
  },

  isFollowing(userId, targetType, targetId, db = prisma) {
    if (!userId) return null;
    return db.follow.findUnique({
      where: { followerId_targetType_targetId: { followerId: userId, targetType, targetId } },
      select: { id: true },
    });
  },

  isBlocked(userId, targetType, targetId, db = prisma) {
    return db.userBlock.findUnique({ where: { blockerId_targetType_targetId: { blockerId: userId, targetType, targetId } }, select: { id: true } });
  },

  async followers(targetType, targetId, filters, db = prisma) {
    const rows = await db.follow.findMany({
      where: { targetType, targetId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: filters.limit + 1,
      ...(filters.cursor && { cursor: { id: filters.cursor }, skip: 1 }),
      select: { id: true, createdAt: true, follower: { select: { id: true, displayName: true, avatarUrl: true, creatorProfile: { select: { id: true, slug: true } }, businessProfile: { select: { id: true, slug: true } } } } },
    });
    return { items: rows.slice(0, filters.limit), nextCursor: rows.length > filters.limit ? rows[filters.limit - 1].id : null };
  },

  async following(ownerUserId, filters, db = prisma) {
    const rows = await db.follow.findMany({
      where: { followerId: ownerUserId, targetType: { in: ['CREATOR', 'BUSINESS'] } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: filters.limit + 1,
      ...(filters.cursor && { cursor: { id: filters.cursor }, skip: 1 }),
      select: { id: true, targetType: true, targetId: true, createdAt: true },
    });
    return { items: rows.slice(0, filters.limit), nextCursor: rows.length > filters.limit ? rows[filters.limit - 1].id : null };
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
