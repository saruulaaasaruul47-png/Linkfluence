import { prisma } from '../../config/database.js';

export const paymentRepository = {
  transaction(callback) {
    return prisma.$transaction(callback);
  },
  findCollaboration(id, db = prisma) {
    return db.collaboration.findUnique({
      where: { id },
      include: {
        contract: true,
        business: { select: { userId: true, companyName: true } },
        creator: { select: { userId: true, channelName: true } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
  },
  findPayment(id, db = prisma) {
    return db.payment.findUnique({
      where: { id },
      include: {
        collaboration: {
          include: {
            business: { select: { userId: true } },
            creator: { select: { userId: true } },
          },
        },
      },
    });
  },
  findByProviderRef(providerRef, db = prisma) {
    return db.payment.findUnique({ where: { providerRef } });
  },
  listForUser(userId, { page, limit, status, type }) {
    const where = {
      collaboration: {
        OR: [{ business: { userId } }, { creator: { userId } }],
      },
      ...(status && { status }),
      ...(type && { type }),
    };
    return prisma.$transaction(async (tx) => {
      const [items, total] = await Promise.all([
        tx.payment.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        tx.payment.count({ where }),
      ]);
      return { items, total };
    });
  },
};
