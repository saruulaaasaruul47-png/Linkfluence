import { prisma } from '../../config/database.js';

const creatorInclude = {
  creator: {
    include: {
      socialAccounts: { orderBy: { followerCount: 'desc' } },
    },
  },
  campaign: { select: { id: true, slug: true, title: true } },
};

const invitationInclude = {
  creator: {
    select: {
      id: true,
      userId: true,
      slug: true,
      channelName: true,
      avatarUrl: true,
      verificationStatus: true,
    },
  },
  business: {
    select: {
      id: true,
      userId: true,
      slug: true,
      companyName: true,
      logoUrl: true,
      verificationStatus: true,
    },
  },
  campaign: {
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      budgetMin: true,
      budgetMax: true,
      currency: true,
      applicationDeadline: true,
    },
  },
};

export const sourcingRepository = {
  findBusiness(userId) {
    return prisma.businessProfile.findUnique({
      where: { userId },
      select: { id: true, userId: true },
    });
  },

  findCreator(identifier) {
    return prisma.creatorProfile.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier.replace(/^@/, '').toLowerCase() }],
        user: { status: 'ACTIVE', deletedAt: null },
      },
      select: { id: true, userId: true },
    });
  },

  findCreatorByUserId(userId) {
    return prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true, userId: true },
    });
  },

  findCampaign(identifier) {
    return prisma.campaign.findFirst({
      where: { OR: [{ id: identifier }, { slug: identifier.toLowerCase() }] },
      select: { id: true, businessId: true, status: true },
    });
  },

  listShortlist(businessId, contextKey) {
    return prisma.creatorShortlist.findMany({
      where: { businessId, contextKey },
      include: creatorInclude,
      orderBy: { createdAt: 'desc' },
    });
  },

  upsertShortlist(data) {
    return prisma.creatorShortlist.upsert({
      where: {
        businessId_creatorId_contextKey: {
          businessId: data.businessId,
          creatorId: data.creatorId,
          contextKey: data.contextKey,
        },
      },
      create: data,
      update: { note: data.note },
      include: creatorInclude,
    });
  },

  removeShortlist(businessId, creatorId, contextKey) {
    return prisma.creatorShortlist.deleteMany({ where: { businessId, creatorId, contextKey } });
  },

  listCompare(businessId, contextKey) {
    return prisma.creatorComparison.findMany({
      where: { businessId, contextKey },
      include: creatorInclude,
      orderBy: { createdAt: 'asc' },
    });
  },

  countCompare(businessId, contextKey) {
    return prisma.creatorComparison.count({ where: { businessId, contextKey } });
  },

  findCompare(businessId, creatorId, contextKey) {
    return prisma.creatorComparison.findUnique({
      where: {
        businessId_creatorId_contextKey: { businessId, creatorId, contextKey },
      },
      include: creatorInclude,
    });
  },

  upsertCompare(data) {
    return prisma.creatorComparison.upsert({
      where: {
        businessId_creatorId_contextKey: {
          businessId: data.businessId,
          creatorId: data.creatorId,
          contextKey: data.contextKey,
        },
      },
      create: data,
      update: {},
      include: creatorInclude,
    });
  },

  removeCompare(businessId, creatorId, contextKey) {
    return prisma.creatorComparison.deleteMany({ where: { businessId, creatorId, contextKey } });
  },

  createInvitation(data) {
    return prisma.campaignInvitation.create({ data, include: invitationInclude });
  },

  findInvitation(id) {
    return prisma.campaignInvitation.findUnique({ where: { id }, include: invitationInclude });
  },

  async listInvitations(where, page, limit) {
    const [items, total] = await prisma.$transaction([
      prisma.campaignInvitation.findMany({
        where,
        include: invitationInclude,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.campaignInvitation.count({ where }),
    ]);
    return { items, total };
  },

  updateInvitation(id, data) {
    return prisma.campaignInvitation.update({ where: { id }, data, include: invitationInclude });
  },
};
