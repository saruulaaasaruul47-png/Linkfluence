import { prisma } from '../../config/database.js';

export const reconciliationRepository = {
  transaction(callback) { return prisma.$transaction(callback); },
  find(provider, periodStart, periodEnd) {
    return prisma.reconciliationRun.findUnique({ where: { provider_periodStart_periodEnd: { provider, periodStart, periodEnd } } });
  },
};
