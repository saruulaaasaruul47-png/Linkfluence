import { prisma } from '../../config/database.js';

export const payoutAccountRepository = {
  list(userId) {
    return prisma.payoutAccount.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
  },
  transaction(callback) { return prisma.$transaction(callback); },
  async remove(userId, id) {
    return prisma.payoutAccount.deleteMany({ where: { id, userId, payouts: { none: {} } } });
  },
};
