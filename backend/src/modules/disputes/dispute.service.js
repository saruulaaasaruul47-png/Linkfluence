import { AppError } from '../../shared/errors/AppError.js';
import { disputeRepository } from './dispute.repository.js';
import { ledgerRules, postLedgerBatch } from '../payments/ledger.service.js';

function participant(collaboration, userId) {
  if (!collaboration) throw new AppError('Collaboration was not found.', 404, 'COLLABORATION_NOT_FOUND');
  if (![collaboration.business.userId, collaboration.creator.userId].includes(userId)) {
    throw new AppError('Collaboration was not found.', 404, 'COLLABORATION_NOT_FOUND');
  }
}

async function ownedEvidence(tx, userId, evidence) {
  const ids = evidence.map((item) => item.mediaAssetId).filter(Boolean);
  if (!ids.length) return;
  const count = await tx.mediaAsset.count({ where: { id: { in: ids }, ownerId: userId, deletedAt: null } });
  if (count !== new Set(ids).size) throw new AppError('Evidence file was not found.', 404, 'EVIDENCE_NOT_FOUND');
}

export function calculateDisputeAward({ total, fee, award, creatorPercent }) {
  const percent = award === 'CREATOR_WINS' ? 100 : award === 'BUSINESS_WINS' ? 0 : creatorPercent;
  const creatorGross = Math.round(Number(total) * percent) / 100;
  const platformFee = Math.round((creatorGross * Number(fee) / Number(total)) * 100) / 100;
  return {
    creatorPercent: percent,
    creatorAward: Math.round((creatorGross - platformFee) * 100) / 100,
    businessAward: Math.round((Number(total) - creatorGross) * 100) / 100,
    platformFee,
  };
}

export const disputeService = {
  async list(userId, collaborationId) {
    const collaboration = await disputeRepository.collaboration(collaborationId);
    participant(collaboration, userId);
    return { items: await disputeRepository.list(collaborationId) };
  },
  async open(userId, collaborationId, payload) {
    const collaboration = await disputeRepository.collaboration(collaborationId);
    participant(collaboration, userId);
    if (['COMPLETED', 'CANCELLED'].includes(collaboration.status)) {
      throw new AppError('A dispute cannot be opened for this collaboration state.', 409, 'DISPUTE_NOT_ALLOWED');
    }
    if (await disputeRepository.active(collaborationId)) {
      throw new AppError('An active dispute already exists.', 409, 'ACTIVE_DISPUTE_EXISTS');
    }
    return disputeRepository.transaction(async (tx) => {
      await ownedEvidence(tx, userId, payload.evidence);
      const dispute = await tx.trustCase.create({
        data: {
          kind: 'DISPUTE', status: 'OPEN', priority: payload.priority,
          reporterId: userId, targetType: 'COLLABORATION', targetId: collaborationId,
          reason: payload.reason,
          evidence: payload.evidence.map((item) => ({ ...item, submittedBy: userId, submittedAt: new Date().toISOString() })),
        },
      });
      await tx.collaborationActivity.create({
        data: { collaborationId, type: 'DISPUTE_OPENED', message: 'A participant opened a payment-blocking dispute.', actorId: userId, metadata: { disputeId: dispute.id } },
      });
      await tx.outboxEvent.create({ data: { topic: 'dispute.opened', aggregateId: dispute.id, payload: { collaborationId, reporterId: userId } } });
      return dispute;
    });
  },
  async addEvidence(userId, id, payload) {
    return disputeRepository.transaction(async (tx) => {
      const dispute = await tx.trustCase.findFirst({ where: { id, kind: 'DISPUTE', targetType: 'COLLABORATION' } });
      if (!dispute) throw new AppError('Dispute was not found.', 404, 'DISPUTE_NOT_FOUND');
      const collaboration = await tx.collaboration.findUnique({
        where: { id: dispute.targetId },
        select: { business: { select: { userId: true } }, creator: { select: { userId: true } } },
      });
      participant(collaboration, userId);
      if (['RESOLVED', 'DISMISSED'].includes(dispute.status)) throw new AppError('This dispute is closed.', 409, 'DISPUTE_CLOSED');
      await ownedEvidence(tx, userId, [payload]);
      const evidence = Array.isArray(dispute.evidence) ? dispute.evidence : [];
      return tx.trustCase.update({
        where: { id },
        data: { evidence: [...evidence, { ...payload, submittedBy: userId, submittedAt: new Date().toISOString() }], status: 'UNDER_REVIEW' },
      });
    });
  },
  async resolveAward(actorId, id, payload, ipAddress) {
    return disputeRepository.transaction(async (tx) => {
      const dispute = await tx.trustCase.findFirst({ where: { id, kind: 'DISPUTE', targetType: 'COLLABORATION' } });
      if (!dispute) throw new AppError('Dispute was not found.', 404, 'DISPUTE_NOT_FOUND');
      if (['RESOLVED', 'DISMISSED'].includes(dispute.status)) throw new AppError('This dispute is already closed.', 409, 'DISPUTE_CLOSED');
      const collaboration = await tx.collaboration.findUnique({
        where: { id: dispute.targetId },
        include: {
          business: { select: { userId: true } },
          creator: { select: { userId: true } },
          payments: { include: { refundRequests: true, platformRevenue: true } },
        },
      });
      const funding = collaboration?.payments.find((payment) => (
        ['FUNDING', 'BARTER_PLATFORM_FEE'].includes(payment.type)
        && ['FUNDED', 'PARTIALLY_REFUNDED'].includes(payment.status)
      ));
      if (!funding) throw new AppError('Funded escrow was not found.', 409, 'DISPUTE_ESCROW_NOT_FOUND');
      if (collaboration.payments.some((payment) => payment.type === 'MILESTONE_RELEASE' && payment.status === 'RELEASED')) throw new AppError('Released settlement cannot be awarded again.', 409, 'DISPUTE_ALREADY_SETTLED');
      const walletFunding = funding.provider === 'internal' && funding.metadata?.source === 'BUSINESS_WALLET';
      const total = walletFunding
        ? Number(funding.creatorAmount) + Number(funding.platformFee)
        : Number(funding.amount);
      if (total <= 0) throw new AppError('Funded escrow was not found.', 409, 'DISPUTE_ESCROW_NOT_FOUND');
      const { creatorPercent, creatorAward, businessAward, platformFee } = calculateDisputeAward({ total, fee: funding.platformFee, award: payload.award, creatorPercent: payload.creatorPercent });
      if (walletFunding) {
        await postLedgerBatch(tx, ledgerRules.walletDisputeSettlement({
          disputeId: dispute.id,
          payment: funding,
          businessUserId: collaboration.business.userId,
          creatorUserId: collaboration.creator.userId,
          creatorAward,
          businessAward,
          platformFee,
        }));
        await tx.payment.update({
          where: { id: funding.id },
          data: {
            status: creatorPercent > 0 ? 'RELEASED' : 'REFUNDED',
            creatorAmount: creatorAward,
            platformFee,
            commissionAmount: funding.compensationType === 'BARTER' ? 0 : platformFee,
            releasedAt: creatorPercent > 0 ? new Date() : null,
            refundedAt: businessAward > 0 ? new Date() : null,
            processedAt: new Date(),
          },
        });
        if (funding.platformRevenue) {
          await tx.platformRevenue.update({
            where: { id: funding.platformRevenue.id },
            data: platformFee > 0
              ? { status: 'EARNED', amount: platformFee, earnedAt: new Date(), refundedAt: businessAward > 0 ? new Date() : null }
              : { status: 'REFUNDED', amount: 0, refundedAt: new Date() },
          });
        }
      } else {
        const postings = [];
        if (creatorAward > 0) postings.push({ type: 'DISPUTE_ADJUSTMENT', amount: creatorAward, debit: { code: `escrow:${collaboration.id}:${funding.currency}`, type: 'ESCROW_LIABILITY' }, credit: { code: `creator-payable:${collaboration.creator.userId}:${funding.currency}`, type: 'CREATOR_PAYABLE', ownerId: collaboration.creator.userId }, description: 'Creator dispute award recognized.' });
        if (platformFee > 0) postings.push({ type: 'COMMISSION_EARNED', amount: platformFee, debit: { code: `escrow:${collaboration.id}:${funding.currency}`, type: 'ESCROW_LIABILITY' }, credit: { code: `platform-revenue:${funding.currency}`, type: 'PLATFORM_REVENUE' }, description: 'Commission recognized on the creator dispute award.' });
        if (businessAward > 0) postings.push({ type: 'DISPUTE_ADJUSTMENT', amount: businessAward, debit: { code: `escrow:${collaboration.id}:${funding.currency}`, type: 'ESCROW_LIABILITY' }, credit: { code: `refund-payable:${collaboration.id}:${funding.currency}`, type: 'REFUND_PAYABLE' }, description: 'Business dispute refund award recognized.' });
        await postLedgerBatch(tx, { batchId: `dispute:${dispute.id}`, paymentId: funding.id, collaborationId: collaboration.id, currency: funding.currency, postings });
        if (creatorAward > 0) await tx.payment.create({ data: { collaborationId: collaboration.id, parentId: funding.id, type: 'MILESTONE_RELEASE', status: 'RELEASED', amount: creatorAward, platformFee, currency: funding.currency, provider: 'dispute-award', providerRef: `dispute_release_${dispute.id}`, processedAt: new Date() } });
      }
      if (businessAward > 0) await tx.paymentRefund.create({ data: { paymentId: funding.id, requesterId: actorId, amount: businessAward, reason: payload.reason, status: 'REFUNDED', providerRef: `dispute_refund_${dispute.id}`, processedAt: new Date() } });
      const resolutionData = { award: payload.award, creatorPercent, creatorAward, businessAward, platformFee, currency: funding.currency };
      const resolved = await tx.trustCase.update({ where: { id }, data: { status: 'RESOLVED', resolution: payload.reason, resolutionData, resolvedAt: new Date(), assignedAdminId: actorId } });
      await tx.collaboration.update({ where: { id: collaboration.id }, data: { status: creatorPercent > 0 ? 'COMPLETED' : 'CANCELLED', progress: creatorPercent > 0 ? 100 : collaboration.progress, completedAt: creatorPercent > 0 ? new Date() : null, settlementDueAt: null } });
      await tx.adminAction.create({ data: { actorId, action: 'DISPUTE_AWARD_RESOLVED', targetType: 'TRUST_CASE', targetId: id, reason: payload.reason, before: { status: dispute.status }, after: resolutionData, ipAddress } });
      await tx.outboxEvent.create({ data: { topic: 'dispute.resolved', aggregateId: id, payload: { disputeId: id, collaborationId: collaboration.id, ...resolutionData } } });
      return resolved;
    });
  },
};
