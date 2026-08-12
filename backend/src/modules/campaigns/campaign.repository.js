import { prisma } from '../../config/database.js';

export const campaignInclude = {
  business: {
    select: {
      id: true,
      userId: true,
      slug: true,
      companyName: true,
      logoUrl: true,
      coverUrl: true,
      verificationStatus: true,
      user: {
        select: {
          status: true,
          deletedAt: true,
        },
      },
    },
  },
  attachments: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, name: true, url: true, mimeType: true, sizeBytes: true, kind: true, createdAt: true,
    },
  },
  _count: {
    select: {
      proposals: true,
      invitations: true,
      shortlistEntries: true,
    },
  },
};

export const campaignRepository = {
  transaction(callback) { return prisma.$transaction(callback); },
  findBusinessByUserId(userId, db = prisma) {
    return db.businessProfile.findUnique({
      where: { userId },
      select: { id: true, companyName: true, slug: true, verificationStatus: true },
    });
  },

  findCreatorByUserId(userId, db = prisma) {
    return db.creatorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
  },

  findBySlug(slug, db = prisma) {
    return db.campaign.findUnique({ where: { slug }, select: { id: true } });
  },

  async listPublic(filters) {
    const where = {
      status: 'OPEN',
      isPublic: true,
      business: {
        user: {
          status: 'ACTIVE',
          deletedAt: null,
        },
      },
      OR: [
        { applicationDeadline: null },
        { applicationDeadline: { gt: new Date() } },
      ],
      ...(filters.q && {
        AND: [{
          OR: [
            { title: { contains: filters.q, mode: 'insensitive' } },
            { description: { contains: filters.q, mode: 'insensitive' } },
            { business: { companyName: { contains: filters.q, mode: 'insensitive' } } },
          ],
        }],
      }),
      ...(filters.category && { category: filters.category }),
      ...(filters.platform && { platforms: { has: filters.platform } }),
      ...(filters.minBudget !== undefined && { budgetMax: { gte: filters.minBudget } }),
      ...(filters.maxBudget !== undefined && { budgetMin: { lte: filters.maxBudget } }),
    };
    const orders = {
      newest: { publishedAt: 'desc' },
      deadline: { applicationDeadline: { sort: 'asc', nulls: 'last' } },
      budget_low: { budgetMin: { sort: 'asc', nulls: 'last' } },
      budget_high: { budgetMax: { sort: 'desc', nulls: 'last' } },
    };
    const [items, total] = await prisma.$transaction([
      prisma.campaign.findMany({
        where,
        include: campaignInclude,
        orderBy: orders[filters.sort],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.campaign.count({ where }),
    ]);
    return { items, total };
  },

  async listOwned(businessId, filters) {
    const where = {
      businessId,
      ...(filters.status && { status: filters.status }),
      ...(filters.q && { title: { contains: filters.q, mode: 'insensitive' } }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.campaign.findMany({
        where,
        include: campaignInclude,
        orderBy: { updatedAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.campaign.count({ where }),
    ]);
    return { items, total };
  },

  findByIdentifier(identifier, db = prisma) {
    return db.campaign.findFirst({
      where: { OR: [{ id: identifier }, { slug: identifier.toLowerCase() }] },
      include: campaignInclude,
    });
  },

  create(data) {
    return prisma.campaign.create({ data, include: campaignInclude });
  },

  async updateOwned(id, businessId, expectedVersion, data) {
    const result = await prisma.campaign.updateMany({
      where: { id, businessId, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count !== 1) return null;
    return prisma.campaign.findUnique({ where: { id }, include: campaignInclude });
  },

  remove(id) {
    return prisma.campaign.delete({ where: { id } });
  },

  findOwnedMedia(id, ownerId, db = prisma) {
    return db.mediaAsset.findFirst({ where: { id, ownerId, deletedAt: null } });
  },

  createAttachment(campaignId, uploadedById, data, db = prisma) {
    return db.campaignAttachment.create({ data: { campaignId, uploadedById, ...data } });
  },

  async removeAttachment(id, campaignId, db = prisma) {
    const result = await db.campaignAttachment.deleteMany({ where: { id, campaignId } });
    return result.count === 1;
  },
};
