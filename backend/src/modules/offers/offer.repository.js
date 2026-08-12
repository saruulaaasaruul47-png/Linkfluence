import { prisma } from '../../config/database.js';

export const offerInclude = {
  business: { select: { id: true, userId: true, companyName: true, slug: true, logoUrl: true } },
  creator: { select: { id: true, userId: true, channelName: true, slug: true, avatarUrl: true } },
  campaign: { select: { id: true, businessId: true, title: true, slug: true } },
  collaboration: { select: { id: true } },
};

export const offerRepository = {
  transaction(callback) {
    return prisma.$transaction(callback);
  },
  findBusiness(userId, db = prisma) {
    return db.businessProfile.findUnique({ where: { userId } });
  },
  findCreator(identifier, db = prisma) {
    return db.creatorProfile.findFirst({
      where: { OR: [{ id: identifier }, { slug: identifier.toLowerCase() }] },
    });
  },
  findCreatorByUserId(userId, db = prisma) {
    return db.creatorProfile.findUnique({ where: { userId } });
  },
  findCampaign(identifier, db = prisma) {
    return db.campaign.findFirst({
      where: { OR: [{ id: identifier }, { slug: identifier.toLowerCase() }] },
    });
  },
  findById(id, db = prisma) {
    return db.workOffer.findUnique({ where: { id }, include: offerInclude });
  },
  create(data, actorId) {
    return prisma.$transaction(async (tx) => {
      const offer = await tx.workOffer.create({ data });
      await tx.offerRevision.create({
        data: {
          offerId: offer.id,
          actorId,
          version: 1,
          action: 'CREATED',
          snapshot: {
            title: offer.title,
            contentType: offer.contentType,
            budget: String(offer.budget),
            paymentType: offer.paymentType,
            barterDetails: offer.barterDetails,
            currency: offer.currency,
            timeline: offer.timeline,
            message: offer.message,
            status: offer.status,
          },
        },
      });
      await tx.outboxEvent.create({
        data: { topic: 'offer.created', aggregateId: offer.id, payload: { offerId: offer.id, creatorId: offer.creatorId } },
      });
      return tx.workOffer.findUnique({ where: { id: offer.id }, include: offerInclude });
    });
  },
  async list(where, { page, limit }) {
    const [items, total] = await prisma.$transaction([
      prisma.workOffer.findMany({
        where,
        include: offerInclude,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.workOffer.count({ where }),
    ]);
    return { items, total };
  },
};
