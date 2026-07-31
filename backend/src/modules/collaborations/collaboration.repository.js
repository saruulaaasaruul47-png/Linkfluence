import { prisma } from '../../config/database.js';

export const collaborationInclude = {
  campaign: { select: { id: true, title: true, slug: true } },
  business: { select: { id: true, userId: true, companyName: true, slug: true, logoUrl: true } },
  creator: { select: { id: true, userId: true, channelName: true, slug: true, avatarUrl: true } },
  agreementVersions: { orderBy: { version: 'desc' } },
  contract: { include: { versions: { orderBy: { version: 'desc' } } } },
  workspaceTasks: { orderBy: { createdAt: 'asc' } },
  workspaceFiles: { orderBy: { createdAt: 'desc' } },
  activities: { orderBy: { createdAt: 'desc' }, take: 100 },
  deliverables: { orderBy: [{ createdAt: 'desc' }, { version: 'desc' }] },
  payments: { orderBy: { createdAt: 'desc' } },
  reviews: { orderBy: { createdAt: 'desc' } },
  showcasePost: { select: { id: true, status: true } },
};

export const collaborationRepository = {
  transaction(callback) {
    return prisma.$transaction(callback);
  },
  findById(id, db = prisma) {
    return db.collaboration.findUnique({ where: { id }, include: collaborationInclude });
  },
  async list(userId, { side, status, page, limit }) {
    const where = {
      ...(side === 'business' ? { business: { userId } } : { creator: { userId } }),
      ...(status && { status }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.collaboration.findMany({
        where,
        include: collaborationInclude,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.collaboration.count({ where }),
    ]);
    return { items, total };
  },
};
