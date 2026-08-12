import { prisma } from '../../config/database.js';

const publicInclude = {
  creator: {
    select: {
      id: true,
      slug: true,
      channelName: true,
      avatarUrl: true,
      verificationStatus: true,
    },
  },
  _count: { select: { reactions: true } },
};

export const showcaseRepository = {
  countPublic() {
    return prisma.showcasePost.count({ where: { status: 'PUBLISHED' } });
  },

  async list(filters, followerId = null) {
    let followedCreatorIds;
    if (followerId) {
      followedCreatorIds = (await prisma.follow.findMany({
        where: { followerId, targetType: 'CREATOR' },
        select: { targetId: true },
      })).map((item) => item.targetId);
    }
    const where = {
      status: 'PUBLISHED',
      ...(filters.q && {
        OR: [
          { title: { contains: filters.q, mode: 'insensitive' } },
          { description: { contains: filters.q, mode: 'insensitive' } },
        ],
      }),
      ...(filters.category && { category: { equals: filters.category, mode: 'insensitive' } }),
      ...(filters.creatorId && { creatorId: filters.creatorId }),
      ...(followedCreatorIds && { creatorId: { in: followedCreatorIds } }),
    };
    const rows = await prisma.showcasePost.findMany({
      where,
      include: publicInclude,
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: filters.limit + 1,
      ...(filters.cursor && { cursor: { id: filters.cursor }, skip: 1 }),
    });
    return {
      items: rows.slice(0, filters.limit),
      nextCursor: rows.length > filters.limit ? rows[filters.limit - 1].id : null,
    };
  },

  findPublic(id) {
    return prisma.showcasePost.findFirst({
      where: { id, status: 'PUBLISHED' },
      include: publicInclude,
    });
  },

  listOwned(userId) {
    return prisma.showcasePost.findMany({
      where: { creator: { userId } },
      include: publicInclude,
      orderBy: { updatedAt: 'desc' },
    });
  },

  findOwned(id, userId) {
    return prisma.showcasePost.findFirst({
      where: { id, creator: { userId } },
      include: publicInclude,
    });
  },

  findOwnedPortfolio(portfolioItemId, userId) {
    return prisma.portfolioItem.findFirst({
      where: {
        id: portfolioItemId,
        deletedAt: null,
        creator: { userId },
      },
      include: { creator: { select: { id: true } } },
    });
  },

  findByPortfolio(portfolioItemId, userId) {
    return prisma.showcasePost.findFirst({
      where: { portfolioItemId, creator: { userId }, status: { not: 'ARCHIVED' } },
      select: { id: true },
    });
  },

  create(data) {
    return prisma.showcasePost.create({ data, include: publicInclude });
  },

  update(id, data) {
    return prisma.showcasePost.update({ where: { id }, data, include: publicInclude });
  },

  like(userId, showcaseId) {
    return prisma.showcaseReaction.upsert({
      where: { userId_showcaseId_type: { userId, showcaseId, type: 'LIKE' } },
      create: { userId, showcaseId, type: 'LIKE' },
      update: {},
    });
  },

  unlike(userId, showcaseId) {
    return prisma.showcaseReaction.deleteMany({
      where: { userId, showcaseId, type: 'LIKE' },
    });
  },

  isLiked(userId, showcaseId) {
    return prisma.showcaseReaction.findUnique({
      where: { userId_showcaseId_type: { userId, showcaseId, type: 'LIKE' } },
      select: { id: true },
    });
  },
};
