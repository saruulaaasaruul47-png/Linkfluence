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
  findForDelivery(id, db = prisma) {
    return db.mediaAsset.findFirst({
      where: { id, deletedAt: null },
      include: {
        portfolioItems: { where: { deletedAt: null }, select: { status: true } },
        collaborationFiles: {
          select: { collaboration: { select: { business: { select: { userId: true } }, creator: { select: { userId: true } } } } },
        },
        deliverables: {
          select: { collaboration: { select: { business: { select: { userId: true } }, creator: { select: { userId: true } } } } },
        },
        contentMedia: { select: { post: { select: { status: true, visibility: true, deletedAt: true, creatorId: true, businessId: true, creator: { select: { userId: true } }, business: { select: { userId: true } } } } } },
        contentThumbnails: { select: { post: { select: { status: true, visibility: true, deletedAt: true, creatorId: true, businessId: true, creator: { select: { userId: true } }, business: { select: { userId: true } } } } } },
        contentAudioPosts: { select: { status: true, visibility: true, deletedAt: true, creatorId: true, businessId: true, creator: { select: { userId: true } }, business: { select: { userId: true } } } },
        campaignAttachments: {
          select: {
            campaign: {
              select: {
                isPublic: true,
                status: true,
                business: { select: { userId: true } },
                collaborations: { select: { business: { select: { userId: true } }, creator: { select: { userId: true } } } },
              },
            },
          },
        },
      },
    });
  },

  follows(userId, targets, db = prisma) {
    if (!userId || !targets.length) return [];
    return db.follow.findMany({
      where: {
        followerId: userId,
        OR: targets.map((target) => ({ targetType: target.targetType, targetId: target.targetId })),
      },
      select: { targetType: true, targetId: true },
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
        contentMedia: { none: {} },
        contentThumbnails: { none: {} },
        contentAudioPosts: { none: {} },
        campaignAttachments: { none: {} },
      },
      data: { deletedAt: new Date() },
    });
  },
};
