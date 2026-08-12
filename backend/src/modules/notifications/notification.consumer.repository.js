import { prisma } from '../../config/database.js';

const participantSelect = {
  business: { select: { user: { select: { id: true, email: true, displayName: true } } } },
  creator: { select: { user: { select: { id: true, email: true, displayName: true } } } },
};

export const notificationConsumerRepository = {
  async context(topic, aggregateId, payload) {
    if (topic.startsWith('offer.')) {
      return prisma.workOffer.findUnique({ where: { id: payload.offerId || aggregateId }, include: participantSelect });
    }
    if (topic.startsWith('proposal.')) {
      return prisma.proposal.findUnique({
        where: { id: payload.proposalId || aggregateId },
        include: { creator: { select: { user: { select: { id: true, email: true, displayName: true } } } }, campaign: { include: { business: { select: { user: { select: { id: true, email: true, displayName: true } } } } } } },
      });
    }
    if (topic.startsWith('contract.')) {
      return prisma.contract.findUnique({ where: { id: payload.contractId || aggregateId }, include: { collaboration: { include: participantSelect } } });
    }
    if (topic.startsWith('payment.')) {
      return prisma.payment.findUnique({ where: { id: payload.paymentId || aggregateId }, include: { collaboration: { include: participantSelect } } });
    }
    if (topic.startsWith('deliverable.')) {
      return prisma.deliverable.findUnique({ where: { id: payload.deliverableId || aggregateId }, include: { collaboration: { include: participantSelect } } });
    }
    if (topic.startsWith('proof.')) {
      return prisma.publishProof.findUnique({ where: { id: payload.proofId || aggregateId }, include: { collaboration: { include: participantSelect } } });
    }
    if (topic.startsWith('payout.')) {
      return prisma.paymentPayout.findUnique({ where: { id: payload.payoutId || aggregateId }, include: { payment: { include: { collaboration: { include: participantSelect } } } } });
    }
    if (topic.startsWith('collaboration.') || topic.startsWith('deadline.') || topic.startsWith('showcase.')) {
      return prisma.collaboration.findUnique({ where: { id: payload.collaborationId || aggregateId }, include: participantSelect });
    }
    return null;
  },
  preference(userId) {
    return prisma.notificationPreference.findUnique({ where: { userId } });
  },
  createMany(items) {
    return prisma.notification.createMany({ data: items, skipDuplicates: true });
  },
  findBySourceEvent(sourceEventId) {
    return prisma.notification.findMany({ where: { sourceEventId } });
  },
};
