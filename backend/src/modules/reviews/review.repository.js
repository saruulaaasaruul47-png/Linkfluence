import { prisma } from '../../config/database.js';

export const reviewRepository = {
  transaction(callback) {
    return prisma.$transaction(callback);
  },
  findCollaboration(id, db = prisma) {
    return db.collaboration.findUnique({
      where: { id },
      include: {
        campaign: { select: { title: true, category: true } },
        business: { select: { id: true, userId: true, companyName: true } },
        creator: { select: { id: true, userId: true, channelName: true } },
        reviews: true,
        deliverables: { orderBy: [{ createdAt: 'desc' }, { version: 'desc' }] },
        showcasePost: true,
      },
    });
  },
};
