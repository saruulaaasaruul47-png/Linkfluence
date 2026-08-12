import { prisma } from '../../config/database.js';

export const seoRepository = {
  async listPublicRoutes() {
    const [creators, businesses, showcase] = await Promise.all([
      prisma.creatorProfile.findMany({
        where: { user: { status: 'ACTIVE', deletedAt: null } },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.businessProfile.findMany({
        where: { user: { status: 'ACTIVE', deletedAt: null } },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.showcasePost.findMany({
        where: { status: 'PUBLISHED', creator: { user: { status: 'ACTIVE', deletedAt: null } } },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    return { creators, businesses, showcase };
  },
};
