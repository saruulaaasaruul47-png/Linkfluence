import { prisma } from '../../config/database.js';

export const walletRepository = {
  transaction(callback) {
    return prisma.$transaction(callback, { isolationLevel: 'Serializable' });
  },
  businessForUser(userId, db = prisma) {
    return db.businessProfile.findUnique({ where: { userId }, select: { id: true, userId: true, companyName: true } });
  },
  collaboration(id, db = prisma) {
    return db.collaboration.findUnique({
      where: { id },
      include: {
        contract: true,
        business: { select: { id: true, userId: true, companyName: true } },
        creator: { select: { id: true, userId: true, channelName: true } },
        payments: { where: { type: { in: ['FUNDING', 'BARTER_PLATFORM_FEE'] } }, orderBy: { createdAt: 'desc' } },
      },
    });
  },
  walletAccount(userId, currency = 'MNT', db = prisma) {
    return db.ledgerAccount.findUnique({
      where: { ownerId_type_currency: { ownerId: userId, type: 'BUSINESS_WALLET', currency } },
    });
  },
  topUpByIdempotency(idempotencyKey, db = prisma) {
    return db.walletTopUp.findUnique({ where: { idempotencyKey } });
  },
  topUpByProviderRef(providerRef, db = prisma) {
    return db.walletTopUp.findUnique({ where: { providerRef } });
  },
  providerEvent(providerEventId, db = prisma) {
    return db.paymentProviderEvent.findUnique({ where: { providerEventId } });
  },
  topUps(userId, limit = 20, db = prisma) {
    return db.walletTopUp.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: limit });
  },
  walletEntries(userId, currency = 'MNT', limit = 30, db = prisma) {
    const code = `business-wallet:${userId}:${currency}`;
    return db.ledgerEntry.findMany({
      where: { OR: [{ debitAccount: { code } }, { creditAccount: { code } }] },
      include: {
        debitAccount: { select: { code: true } },
        creditAccount: { select: { code: true } },
        collaboration: { select: { id: true, campaign: { select: { title: true } } } },
      },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });
  },
};
