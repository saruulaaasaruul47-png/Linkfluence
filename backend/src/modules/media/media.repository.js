import { prisma } from '../../config/database.js';

export const mediaRepository = {
  create(data, db = prisma) {
    return db.mediaAsset.create({ data });
  },

  findById(id, db = prisma) {
    return db.mediaAsset.findUnique({ where: { id } });
  },

  findOwned(id, ownerId, db = prisma) {
    return db.mediaAsset.findFirst({
      where: { id, ownerId, deletedAt: null },
    });
  },

  softDeleteOwned(id, ownerId, db = prisma) {
    return db.mediaAsset.updateMany({
      where: {
        id,
        ownerId,
        deletedAt: null,
        portfolioItems: { none: { deletedAt: null } },
        collaborationFiles: { none: {} },
        deliverables: { none: {} },
      },
      data: { deletedAt: new Date() },
    });
  },
};
