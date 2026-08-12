import { prisma } from '../../config/database.js';

const include = {
  creator: {
    select: {
      id: true,
      userId: true,
      slug: true,
      channelName: true,
      avatarUrl: true,
      verificationStatus: true,
      ratingAverage: true,
    },
  },
  campaign: {
    include: {
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
    },
  },
};

export const proposalRepository = {
  findCreatorByUserId(userId, db = prisma) {
    return db.creatorProfile.findUnique({
      where: { userId },
      select: { id: true, userId: true, verificationStatus: true },
    });
  },

  findBusinessByUserId(userId, db = prisma) {
    return db.businessProfile.findUnique({
      where: { userId },
      select: { id: true, userId: true },
    });
  },

  findCampaign(identifier, db = prisma) {
    return db.campaign.findFirst({
      where: { OR: [{ id: identifier }, { slug: identifier.toLowerCase() }] },
      include: { business: { select: { id: true, userId: true } } },
    });
  },

  findByCampaignCreator(campaignId, creatorId, db = prisma) {
    return db.proposal.findUnique({
      where: { campaignId_creatorId: { campaignId, creatorId } },
      include,
    });
  },

  create(data) {
    return prisma.$transaction(async (tx) => {
      const proposal = await tx.proposal.create({ data, include });
      await tx.outboxEvent.create({ data: { topic: 'proposal.submitted', aggregateId: proposal.id, payload: { proposalId: proposal.id, campaignId: proposal.campaignId, actorId: proposal.creator.userId } } });
      return proposal;
    });
  },

  findById(id) {
    return prisma.proposal.findUnique({ where: { id }, include });
  },

  async listForCreator(creatorId, filters) {
    const where = {
      creatorId,
      ...(filters.campaignId && { campaignId: filters.campaignId }),
      ...(filters.status && { status: filters.status }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.proposal.findMany({
        where,
        include,
        orderBy: { updatedAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.proposal.count({ where }),
    ]);
    return { items, total };
  },

  async listForBusiness(businessId, filters) {
    const where = {
      campaign: { businessId },
      ...(filters.campaignId && { campaignId: filters.campaignId }),
      ...(filters.status && { status: filters.status }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.proposal.findMany({
        where,
        include,
        orderBy: { updatedAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.proposal.count({ where }),
    ]);
    return { items, total };
  },

  async updateVersioned(id, expectedVersion, data, event = null) {
    return prisma.$transaction(async (tx) => {
      const result = await tx.proposal.updateMany({
        where: { id, version: expectedVersion },
        data: { ...data, version: { increment: 1 } },
      });
      if (result.count !== 1) return null;
      const proposal = await tx.proposal.findUnique({ where: { id }, include });
      if (event) {
        await tx.outboxEvent.create({
          data: {
            topic: event.topic,
            aggregateId: proposal.id,
            payload: {
              proposalId: proposal.id,
              campaignId: proposal.campaignId,
              actorId: event.actorId,
            },
          },
        });
      }
      return proposal;
    });
  },

  async decide(proposal, expectedVersion, data, shortlist = false, orchestrate = null) {
    return prisma.$transaction(async (tx) => {
      const result = await tx.proposal.updateMany({
        where: { id: proposal.id, version: expectedVersion },
        data: { ...data, version: { increment: 1 } },
      });
      if (result.count !== 1) return null;
      if (shortlist) {
        await tx.creatorShortlist.upsert({
          where: {
            businessId_creatorId_contextKey: {
              businessId: proposal.campaign.business.id,
              creatorId: proposal.creator.id,
              contextKey: proposal.campaign.id,
            },
          },
          create: {
            businessId: proposal.campaign.business.id,
            creatorId: proposal.creator.id,
            campaignId: proposal.campaign.id,
            contextKey: proposal.campaign.id,
          },
          update: {},
        });
      }
      const workspaceId = orchestrate ? await orchestrate(tx) : null;
      await tx.outboxEvent.create({
        data: {
          topic: `proposal.${String(data.status).toLowerCase()}`,
          aggregateId: proposal.id,
          payload: {
            proposalId: proposal.id,
            campaignId: proposal.campaignId,
            actorId: proposal.campaign.business.userId,
          },
        },
      });
      return {
        record: await tx.proposal.findUnique({ where: { id: proposal.id }, include }),
        workspaceId,
      };
    });
  },
};
