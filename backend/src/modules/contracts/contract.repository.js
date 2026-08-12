import { prisma } from '../../config/database.js';

export const contractRepository = {
  transaction(callback) {
    return prisma.$transaction(callback);
  },
  findById(id, db = prisma) {
    return db.contract.findUnique({
      where: { id },
      include: {
        collaboration: {
          include: {
            campaign: { select: { id: true, title: true, slug: true } },
            offer: { select: { id: true, title: true } },
            business: { select: { id: true, userId: true, companyName: true, slug: true, logoUrl: true } },
            creator: { select: { id: true, userId: true, channelName: true, slug: true, avatarUrl: true } },
            payments: { orderBy: { createdAt: 'desc' } },
          },
        },
        versions: { orderBy: { version: 'desc' } },
      },
    });
  },
  listForActor(actor, filters, db = prisma) {
    const participant = actor.roles.includes('ADMIN') ? {} : {
      OR: [
        { collaboration: { business: { userId: actor.id } } },
        { collaboration: { creator: { userId: actor.id } } },
      ],
    };
    const query = filters.q ? {
      OR: [
        { id: { contains: filters.q, mode: 'insensitive' } },
        { collaboration: { campaign: { title: { contains: filters.q, mode: 'insensitive' } } } },
        { collaboration: { offer: { title: { contains: filters.q, mode: 'insensitive' } } } },
        { collaboration: { business: { companyName: { contains: filters.q, mode: 'insensitive' } } } },
        { collaboration: { creator: { channelName: { contains: filters.q, mode: 'insensitive' } } } },
      ],
    } : {};
    return db.contract.findMany({
      where: {
        AND: [participant, query, ...(filters.status ? [{ status: filters.status }] : [])],
      },
      include: {
        collaboration: {
          include: {
            campaign: { select: { id: true, title: true, slug: true } },
            offer: { select: { id: true, title: true } },
            business: { select: { id: true, userId: true, companyName: true, slug: true, logoUrl: true } },
            creator: { select: { id: true, userId: true, channelName: true, slug: true, avatarUrl: true } },
            payments: { orderBy: { createdAt: 'desc' } },
          },
        },
        versions: { orderBy: { version: 'desc' }, take: 1 },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      take: filters.limit + 1,
    });
  },
};
