import crypto from 'node:crypto';
import { checkPublicationRetention } from '../reviews/publish-proof.provider.js';
import { paymentPort } from '../payments/index.js';
import { reviewService } from '../reviews/index.js';
import { lifecycleRepository } from './lifecycle.repository.js';

function latestDeliverables(items) {
  const superseded = new Set(items.map((item) => item.revisionOfId).filter(Boolean));
  return items.filter((item) => !superseded.has(item.id));
}

export const lifecycleService = {
  async run({ now = new Date(), autoConfirmRelease = true } = {}) {
    const result = {
      autoApproved: 0,
      approvedWalletSettlementsReleased: 0,
      retentionPassed: 0,
      retentionFailed: 0,
      settlementsReleased: 0,
      reviewsForceRevealed: 0,
      portfolioVerified: 0,
      publishRemindersSent: 0,
    };

    for (const collaboration of await lifecycleRepository.autoApprovalDue(now)) {
      const latest = latestDeliverables(collaboration.deliverables);
      const pending = latest.filter((item) => ['SUBMITTED', 'IN_REVIEW'].includes(item.status));
      if (!pending.length) continue;
      await lifecycleRepository.transaction(async (tx) => {
        await tx.deliverable.updateMany({ where: { id: { in: pending.map((item) => item.id) } }, data: { status: 'APPROVED', reviewedAt: now, reviewNote: 'Automatically approved after the 7-day review window.' } });
        await tx.collaboration.update({ where: { id: collaboration.id }, data: { autoApprovalDueAt: null, progress: 90 } });
        await tx.collaborationActivity.create({ data: { collaborationId: collaboration.id, type: 'DELIVERABLES_AUTO_APPROVED', message: 'Pending deliverables were automatically approved after the business review window.' } });
        await tx.outboxEvent.create({ data: { topic: 'deliverable.auto_approved', aggregateId: collaboration.id, payload: { collaborationId: collaboration.id, deliverableIds: pending.map((item) => item.id) } } });
      });
      result.autoApproved += pending.length;
    }

    // Reconcile approvals created before immediate wallet settlement was enabled,
    // and auto-approved work from the block above. The payment service is
    // idempotent, so retries cannot credit either wallet twice.
    for (const collaboration of await lifecycleRepository.approvedWalletSettlementCandidates()) {
      const latest = latestDeliverables(collaboration.deliverables);
      if (!latest.length || !latest.every((item) => item.status === 'APPROVED')) continue;
      const walletFunding = collaboration.payments.find((payment) => (
        ['FUNDING', 'BARTER_PLATFORM_FEE'].includes(payment.type)
        && ['FUNDED', 'PARTIALLY_REFUNDED'].includes(payment.status)
        && payment.provider === 'internal'
        && payment.metadata?.source === 'BUSINESS_WALLET'
      ));
      if (!walletFunding) continue;
      const settled = await paymentPort.releaseWalletFunding(walletFunding, { completeCollaboration: true });
      if (settled.status === 'RELEASED') result.approvedWalletSettlementsReleased += 1;
    }

    for (const proof of await lifecycleRepository.retentionDue(now)) {
      const checked = await checkPublicationRetention(proof);
      if (checked.live === null) continue;
      await lifecycleRepository.transaction(async (tx) => {
        if (checked.live) {
          await tx.publishProof.update({ where: { id: proof.id }, data: { status: 'RETENTION_PASSED', lastCheckedAt: now, failureReason: null } });
          await tx.publishProofMetricSnapshot.create({ data: { proofId: proof.id, isLive: true, source: checked.source, ...(checked.metrics || {}) } });
          await tx.outboxEvent.create({ data: { topic: 'proof.retention_passed', aggregateId: proof.id, payload: { proofId: proof.id, collaborationId: proof.collaborationId } } });
        } else {
          await tx.publishProof.update({ where: { id: proof.id }, data: { status: 'REMOVED', lastCheckedAt: now, failureReason: 'Published content was no longer available at the retention check.' } });
          await tx.collaboration.update({ where: { id: proof.collaborationId }, data: { status: 'DISPUTED', settlementDueAt: null } });
          const active = await tx.trustCase.findFirst({ where: { kind: 'DISPUTE', targetType: 'COLLABORATION', targetId: proof.collaborationId, status: { in: ['OPEN', 'UNDER_REVIEW', 'ESCALATED'] } } });
          if (!active) await tx.trustCase.create({ data: { kind: 'DISPUTE', status: 'UNDER_REVIEW', priority: 10, targetType: 'COLLABORATION', targetId: proof.collaborationId, reason: 'Retention check found that a verified publication was removed.', evidence: [{ proofId: proof.id, postUrl: proof.postUrl, checkedAt: now.toISOString() }] } });
          await tx.outboxEvent.create({ data: { topic: 'proof.retention_failed', aggregateId: proof.id, payload: { proofId: proof.id, collaborationId: proof.collaborationId } } });
        }
      });
      if (checked.live) result.retentionPassed += 1; else result.retentionFailed += 1;
    }

    for (const collaboration of await lifecycleRepository.settlementDue(now)) {
      const activeDispute = await lifecycleRepository.transaction((tx) => tx.trustCase.findFirst({ where: { kind: 'DISPUTE', targetType: 'COLLABORATION', targetId: collaboration.id, status: { in: ['OPEN', 'UNDER_REVIEW', 'WAITING_FOR_USER', 'ESCALATED'] } } }));
      if (activeDispute || !collaboration.publishProofs.some((proof) => ['RETENTION_PENDING', 'RETENTION_PASSED'].includes(proof.status))) continue;
      const walletFunding = collaboration.payments.find((payment) => ['FUNDING', 'BARTER_PLATFORM_FEE'].includes(payment.type) && ['FUNDED', 'PARTIALLY_REFUNDED', 'RELEASED'].includes(payment.status) && payment.provider === 'internal' && payment.metadata?.source === 'BUSINESS_WALLET');
      if (walletFunding) {
        const settled = await paymentPort.releaseWalletFunding(walletFunding);
        if (settled.status === 'RELEASED') result.settlementsReleased += 1;
        continue;
      }
      let release = collaboration.payments.find((payment) => payment.type === 'MILESTONE_RELEASE');
      if (!release) {
        const funding = collaboration.payments.find((payment) => payment.type === 'FUNDING' && payment.status === 'FUNDED');
        if (!funding) continue;
        release = await lifecycleRepository.transaction(async (tx) => {
          await tx.collaboration.update({ where: { id: collaboration.id }, data: { status: 'SETTLEMENT_PENDING', version: { increment: 1 } } });
          const created = await tx.payment.create({ data: { collaborationId: collaboration.id, parentId: funding.id, type: 'MILESTONE_RELEASE', status: 'PENDING', amount: Number(funding.amount) - Number(funding.platformFee), currency: funding.currency, provider: 'internal', providerRef: `internal_release_${crypto.randomUUID()}` } });
          await tx.collaborationActivity.create({ data: { collaborationId: collaboration.id, type: 'SETTLEMENT_PENDING', message: 'The dispute window ended and settlement started.' } });
          return created;
        });
      } else if (collaboration.status !== 'SETTLEMENT_PENDING') {
        await lifecycleRepository.transaction((tx) => tx.collaboration.update({ where: { id: collaboration.id }, data: { status: 'SETTLEMENT_PENDING' } }));
      }
      const settled = await paymentPort.requestRelease(release, autoConfirmRelease);
      if (settled.status === 'RELEASED') result.settlementsReleased += 1;
    }

    result.reviewsForceRevealed = await reviewService.revealStale(now);

    for (const collaboration of await lifecycleRepository.portfolioPendingCollaborations(now)) {
      const media = latestDeliverables(collaboration.deliverables).find((entry) => entry.status === 'APPROVED');
      if (!media) continue;
      const proof = collaboration.publishProofs[0] || null;
      const fileType = (media.fileType || '').toLowerCase();
      const mediaType = fileType.includes('video') ? 'VIDEO' : fileType.includes('image') ? 'IMAGE' : 'DOCUMENT';
      await lifecycleRepository.transaction(async (tx) => {
        const item = await tx.portfolioItem.create({
          data: {
            creatorId: collaboration.creator.id,
            collaborationId: collaboration.id,
            title: collaboration.campaign?.title || media.title,
            description: media.note || null,
            category: collaboration.campaign?.category || null,
            mediaType,
            mediaUrl: media.fileUrl,
            statistics: proof?.metrics || undefined,
            status: 'PUBLISHED',
            verified: true,
            publishedAt: now,
          },
        });
        await tx.collaborationActivity.create({
          data: {
            collaborationId: collaboration.id,
            type: 'PORTFOLIO_VERIFIED',
            message: 'Verified work from this collaboration was added to the creator portfolio.',
            metadata: { portfolioItemId: item.id },
          },
        });
        await tx.outboxEvent.create({
          data: { topic: 'collaboration.portfolio_verified', aggregateId: collaboration.id, payload: { collaborationId: collaboration.id, portfolioItemId: item.id } },
        });
      });
      result.portfolioVerified += 1;
    }

    for (const contract of await lifecycleRepository.publishReminderDue(now)) {
      await lifecycleRepository.transaction(async (tx) => {
        await tx.contract.update({ where: { id: contract.id }, data: { publishReminderSentAt: now } });
        await tx.collaborationActivity.create({
          data: {
            collaborationId: contract.collaborationId,
            type: 'PUBLISH_DEADLINE_REMINDER',
            message: 'A reminder was sent — approved content must be published before the contract deadline.',
          },
        });
        await tx.outboxEvent.create({
          data: { topic: 'deadline.publish_approaching', aggregateId: contract.collaborationId, payload: { collaborationId: contract.collaborationId, publishBy: contract.publishBy } },
        });
      });
      result.publishRemindersSent += 1;
    }

    return result;
  },
};
