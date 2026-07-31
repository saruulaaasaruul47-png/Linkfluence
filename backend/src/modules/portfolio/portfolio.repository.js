import { prisma } from '../../config/database.js';

export const portfolioRepository = {
  findCreator(userId, db = prisma) {
    return db.creatorProfile.findUnique({ where: { userId }, select: { id: true } });
  },

  countActive(creatorId, db = prisma) {
    return db.portfolioItem.count({ where: { creatorId, deletedAt: null } });
  },

  listOwned(creatorId, db = prisma) {
    return db.portfolioItem.findMany({
      where: { creatorId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  },

  findOwned(id, creatorId, db = prisma) {
    return db.portfolioItem.findFirst({ where: { id, creatorId, deletedAt: null } });
  },

  findPublic(id, db = prisma) {
    return db.portfolioItem.findFirst({
      where: {
        id,
        status: 'PUBLISHED',
        deletedAt: null,
        creator: { user: { status: 'ACTIVE', deletedAt: null } },
      },
      include: {
        creator: {
          select: {
            id: true,
            slug: true,
            channelName: true,
            avatarUrl: true,
          },
        },
      },
    });
  },

  create(data, db = prisma) {
    return db.portfolioItem.create({ data });
  },

  update(id, data, db = prisma) {
    return db.portfolioItem.update({ where: { id }, data });
  },

  softDelete(id, db = prisma) {
    return db.portfolioItem.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
