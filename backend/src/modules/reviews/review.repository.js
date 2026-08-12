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
        contract: true,
        reviews: true,
        deliverables: { orderBy: [{ createdAt: 'desc' }, { version: 'desc' }] },
        showcasePost: true,
        showcaseConsents: true,
        publishProofs: { orderBy: { createdAt: 'desc' } },
      },
    });
  },
  socialAccount(id, creatorId) {
    return prisma.socialAccount.findFirst({ where: { id, creatorId }, include: { stats: { orderBy: { capturedAt: 'desc' }, take: 1 } } });
  },
  staleUnrevealed(now, windowDays) {
    const cutoff = new Date(now.getTime() - windowDays * 86400000);
    return prisma.collaboration.findMany({
      where: { status: 'COMPLETED', completedAt: { lte: cutoff }, reviews: { some: { publishedAt: null } } },
      include: {
        business: { select: { id: true, userId: true } },
        creator: { select: { id: true, userId: true } },
        reviews: true,
      },
    });
  },
};
