import { prisma } from '../../config/database.js';

const PUBLISH_REMINDER_LEAD_HOURS = 48;

export const lifecycleRepository = {
  autoApprovalDue(now) {
    return prisma.collaboration.findMany({ where: { status: 'IN_REVIEW', autoApprovalDueAt: { lte: now } }, include: { deliverables: { orderBy: { version: 'asc' } } } });
  },
  approvedWalletSettlementCandidates(limit = 100) {
    return prisma.collaboration.findMany({
      where: {
        status: 'IN_REVIEW',
        payments: {
          some: {
            type: { in: ['FUNDING', 'BARTER_PLATFORM_FEE'] },
            status: { in: ['FUNDED', 'PARTIALLY_REFUNDED'] },
            provider: 'internal',
          },
        },
      },
      include: {
        deliverables: { orderBy: { version: 'asc' } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { updatedAt: 'asc' },
      take: limit,
    });
  },
  retentionDue(now) {
    return prisma.publishProof.findMany({ where: { status: 'RETENTION_PENDING', retentionDueAt: { lte: now } }, include: { socialAccount: true } });
  },
  settlementDue(now) {
    return prisma.collaboration.findMany({ where: { status: 'PROVEN', settlementDueAt: { lte: now } }, include: { contract: true, payments: true, publishProofs: true } });
  },
  // A completed, verified collaboration becomes part of the creator's own portfolio automatically
  // (FR-7.2) — separate from the public Discovery showcase, which still needs both parties' consent.
  portfolioPendingCollaborations(now) {
    return prisma.collaboration.findMany({
      where: { status: 'COMPLETED', completedAt: { lte: now }, portfolioItem: null },
      include: {
        creator: { select: { id: true } },
        campaign: { select: { title: true, category: true } },
        deliverables: { orderBy: [{ createdAt: 'desc' }, { version: 'desc' }] },
        publishProofs: { where: { status: { in: ['RETENTION_PENDING', 'RETENTION_PASSED'] } }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  },
  publishReminderDue(now) {
    const due = new Date(now.getTime() + PUBLISH_REMINDER_LEAD_HOURS * 3600000);
    return prisma.contract.findMany({
      where: {
        publishBy: { not: null, lte: due, gt: now },
        publishReminderSentAt: null,
        collaboration: { status: 'IN_PROGRESS', publishProofs: { none: {} } },
      },
    });
  },
  transaction(callback) { return prisma.$transaction(callback); },
};
