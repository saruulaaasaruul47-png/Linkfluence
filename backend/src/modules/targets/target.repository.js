import { prisma } from '../../config/database.js';

export const targetRepository = {
  findCreator(identifier, db = prisma) {
    return db.creatorProfile.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier.replace(/^@/, '').toLowerCase() }],
        user: { status: 'ACTIVE', deletedAt: null },
      },
      select: {
        id: true,
        userId: true,
        slug: true,
        channelName: true,
        avatarUrl: true,
        coverUrl: true,
      },
    });
  },

  findBusiness(identifier, db = prisma) {
    return db.businessProfile.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier.replace(/^@/, '').toLowerCase() }],
        user: { status: 'ACTIVE', deletedAt: null },
      },
      select: {
        id: true,
        userId: true,
        slug: true,
        companyName: true,
        logoUrl: true,
        coverUrl: true,
      },
    });
  },

  findCampaign(identifier, db = prisma) {
    return db.campaign.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier.toLowerCase() }],
        status: 'OPEN',
        isPublic: true,
      },
      select: { id: true, slug: true, title: true, businessId: true },
    });
  },

  findPortfolio(identifier, db = prisma) {
    return db.portfolioItem.findFirst({
      where: { id: identifier, status: 'PUBLISHED', deletedAt: null },
      select: {
        id: true,
        title: true,
        creatorId: true,
        mediaUrl: true,
        thumbnailUrl: true,
      },
    });
  },

  findShowcase(identifier, db = prisma) {
    return db.showcasePost.findFirst({
      where: { id: identifier, status: 'PUBLISHED' },
      select: {
        id: true,
        title: true,
        creatorId: true,
        mediaUrl: true,
        thumbnailUrl: true,
      },
    });
  },
};
