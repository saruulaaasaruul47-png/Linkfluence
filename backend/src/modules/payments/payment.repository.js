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

  findCreatorByUserId(userId, db = prisma) {
    return db.creatorProfile.findUnique({ where: { userId }, select: { id: true } });
  },

  earningsLedger(userId, year, db = prisma) {
    const occurredAt = year
      ? { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) }
      : undefined;
    return db.ledgerEntry.findMany({
      where: {
        type: { in: ['CREATOR_EARNED', 'CREATOR_PENDING', 'CREATOR_RELEASE', 'PAYOUT_SENT', 'PAYOUT'] },
        OR: [{ creditAccount: { ownerId: userId } }, { debitAccount: { ownerId: userId } }],
        ...(occurredAt && { occurredAt }),
      },
      include: {
        collaboration: {
          select: {
            id: true,
            campaign: { select: { title: true } },
            business: { select: { companyName: true } },
          },
        },
      },
      orderBy: { occurredAt: 'asc' },
    });
  },

  creatorPayableBalance(userId, currency, db = prisma) {
    return db.ledgerAccount.findUnique({
      where: { ownerId_type_currency: { ownerId: userId, type: 'CREATOR_PAYABLE', currency } },
    });
  },
  creatorBalance(userId, type, currency, db = prisma) {
    return db.ledgerAccount.findUnique({ where: { ownerId_type_currency: { ownerId: userId, type, currency } } });
  },
};
