import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { paymentPort } from '../payments/index.js';
import { toDeliverable } from './deliverable.mapper.js';
import { deliverableRepository } from './deliverable.repository.js';

function role(collaboration, userId) {
  if (!collaboration) throw new AppError('Collaboration was not found.', 404, 'COLLABORATION_NOT_FOUND');
  if (collaboration.business.userId === userId) return 'business';
  if (collaboration.creator.userId === userId) return 'creator';
  throw new AppError('Collaboration was not found.', 404, 'COLLABORATION_NOT_FOUND');
}

function latestDeliverables(items) {
  const superseded = new Set(items.map((item) => item.revisionOfId).filter(Boolean));
  return items.filter((item) => !superseded.has(item.id));
}

function walletFunding(collaboration) {
  return collaboration.payments.find((payment) => (
    ['FUNDING', 'BARTER_PLATFORM_FEE'].includes(payment.type)
    && ['FUNDED', 'PARTIALLY_REFUNDED', 'RELEASED'].includes(payment.status)
    && payment.provider === 'internal'
    && payment.metadata?.source === 'BUSINESS_WALLET'
  ));
}

async function completeFromBusinessAcceptance(collaboration) {
  const funding = walletFunding(collaboration);
  if (!funding) {
    throw new AppError('The funded business wallet payment is required before completion.', 409, 'COLLABORATION_FUNDING_REQUIRED');
  }
  return paymentPort.releaseWalletFunding(funding, { completeCollaboration: true });
}

export const deliverableService = {
  async submit(userId, collaborationId, payload, revisionOfId = null) {
    const collaboration = await deliverableRepository.findCollaboration(collaborationId);
    if (role(collaboration, userId) !== 'creator') {
      throw new AppError('Only the creator can submit deliverables.', 403, 'DELIVERABLE_FORBIDDEN');
    }
    const funded = collaboration.payments.some((payment) => (
      ['FUNDING', 'BARTER_PLATFORM_FEE'].includes(payment.type)
      && ['FUNDED', 'PARTIALLY_REFUNDED'].includes(payment.status)
    ));
    if (!['IN_PROGRESS', 'IN_REVIEW'].includes(collaboration.status) || !funded) {
      throw new AppError('Verified funding is required before submission.', 409, 'EARLY_DELIVERABLE_NOT_ALLOWED');
    }
    let previous = null;
    if (revisionOfId) {
      previous = collaboration.deliverables.find((entry) => entry.id === revisionOfId);
      if (!previous) throw new AppError('Deliverable was not found.', 404, 'DELIVERABLE_NOT_FOUND');
      const alreadyRevised = collaboration.deliverables.some((entry) => entry.revisionOfId === previous.id);
      if (previous.status !== 'REVISION_REQUESTED' || alreadyRevised) {
        throw new AppError('This deliverable does not accept another revision.', 409, 'REVISION_NOT_ALLOWED');
      }
      const revisionLimit = collaboration.contract?.revisionLimit ?? 2;
      if (previous.version > revisionLimit) {
        throw new AppError(`The contract allows only ${revisionLimit} revision rounds.`, 409, 'REVISION_LIMIT_REACHED');
      }
    }
    return toDeliverable(await deliverableRepository.transaction(async (tx) => {
      if (payload.mediaAssetId) {
        const media = await tx.mediaAsset.findFirst({ where: { id: payload.mediaAssetId, ownerId: userId } });
        if (!media) throw new AppError('Uploaded media was not found.', 404, 'MEDIA_NOT_FOUND');
      }
      const created = await tx.deliverable.create({
        data: {
          collaborationId,
          uploadedById: userId,
          mediaAssetId: payload.mediaAssetId || null,
          title: payload.title,
          note: payload.note || null,
          fileUrl: payload.fileUrl,
          fileType: payload.fileType || null,
          revisionOfId: previous?.id || null,
          version: previous ? previous.version + 1 : 1,
          status: 'SUBMITTED',
        },
      });
      const autoApprovalDueAt = new Date(Date.now() + env.deliverableAutoApprovalDays * 24 * 60 * 60 * 1000);
      await tx.collaboration.update({ where: { id: collaborationId }, data: { progress: Math.max(collaboration.progress, 80), status: 'IN_REVIEW', autoApprovalDueAt } });
      await tx.collaborationActivity.create({
        data: {
          collaborationId,
          actorId: userId,
          type: previous ? 'DELIVERABLE_REVISED' : 'DELIVERABLE_SUBMITTED',
          message: `${created.title} was submitted for business review.`,
          metadata: { deliverableId: created.id, version: created.version },
        },
      });
      await tx.outboxEvent.create({
        data: { topic: 'deliverable.submitted', aggregateId: created.id, payload: { deliverableId: created.id, collaborationId } },
      });
      return created;
    }));
  },

  async review(userId, collaborationId, deliverableId, payload) {
    const collaboration = await deliverableRepository.findCollaboration(collaborationId);
    if (role(collaboration, userId) !== 'business') {
      throw new AppError('Only the business can review deliverables.', 403, 'DELIVERABLE_REVIEW_FORBIDDEN');
    }
    const target = collaboration.deliverables.find((entry) => entry.id === deliverableId);
    if (!target) throw new AppError('Deliverable was not found.', 404, 'DELIVERABLE_NOT_FOUND');
    if (collaboration.status === 'COMPLETED' && target.status === payload.decision) {
      return { deliverable: toDeliverable(target), completed: true, publicationRequired: false, publicationOptional: true, release: null };
    }
    if (!['IN_PROGRESS', 'IN_REVIEW'].includes(collaboration.status)) {
      throw new AppError('Deliverables cannot be reviewed now.', 409, 'DELIVERABLE_REVIEW_NOT_ALLOWED');
    }
    if (!['SUBMITTED', 'IN_REVIEW'].includes(target.status)) {
      if (target.status === payload.decision && payload.decision === 'APPROVED') {
        const latest = latestDeliverables(collaboration.deliverables);
        if (latest.length && latest.every((entry) => entry.status === 'APPROVED')) {
          const release = await completeFromBusinessAcceptance(collaboration);
          return { deliverable: toDeliverable(target), completed: true, publicationRequired: false, publicationOptional: true, release };
        }
      }
      if (target.status === payload.decision) return { deliverable: toDeliverable(target), completed: false, publicationRequired: false, publicationOptional: false, release: null };
      throw new AppError('This deliverable was already reviewed.', 409, 'DELIVERABLE_ALREADY_REVIEWED');
    }
    if (payload.decision === 'REVISION_REQUESTED' && target.version > (collaboration.contract?.revisionLimit ?? 2)) {
      throw new AppError('The contract revision limit has been reached.', 409, 'REVISION_LIMIT_REACHED');
    }
    const prospectiveLatest = latestDeliverables(collaboration.deliverables).map((entry) => (
      entry.id === target.id ? { ...entry, status: payload.decision } : entry
    ));
    const willComplete = prospectiveLatest.length > 0 && prospectiveLatest.every((entry) => entry.status === 'APPROVED');
    if (willComplete && !walletFunding(collaboration)) {
      throw new AppError('The funded business wallet payment is required before completion.', 409, 'COLLABORATION_FUNDING_REQUIRED');
    }
    const result = await deliverableRepository.transaction(async (tx) => {
      const updated = await tx.deliverable.update({
        where: { id: deliverableId },
        data: {
          status: payload.decision,
          reviewNote: payload.note || null,
          reviewedAt: new Date(),
        },
      });
      await tx.collaborationActivity.create({
        data: {
          collaborationId,
          actorId: userId,
          type: payload.decision === 'APPROVED' ? 'DELIVERABLE_APPROVED' : 'DELIVERABLE_REVISION_REQUESTED',
          message: payload.decision === 'APPROVED'
            ? `Business approved ${target.title}.`
            : `Business requested a revision${payload.note ? `: ${payload.note}` : '.'}`,
          metadata: { deliverableId },
        },
      });
      const all = await tx.deliverable.findMany({ where: { collaborationId }, orderBy: { version: 'asc' } });
      const latest = latestDeliverables(all);
      const completed = latest.length > 0 && latest.every((entry) => entry.status === 'APPROVED');
      if (completed) {
        await tx.collaboration.update({
          where: { id: collaborationId },
          data: { status: 'IN_REVIEW', progress: 90, autoApprovalDueAt: null, version: { increment: 1 } },
        });
        await tx.collaborationActivity.create({
          data: { collaborationId, actorId: userId, type: 'DELIVERABLES_APPROVED', message: 'The business accepted all final deliverables. Wallet settlement and collaboration completion started immediately.' },
        });
      }
      return { updated, completed };
    });
    let release = null;
    if (result.completed) {
      release = await completeFromBusinessAcceptance(collaboration);
    }
    return {
      deliverable: toDeliverable(result.updated),
      completed: result.completed && release?.status === 'RELEASED',
      publicationRequired: false,
      publicationOptional: result.completed,
      release,
    };
  },
};
