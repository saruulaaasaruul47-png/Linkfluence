import crypto from 'node:crypto';
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

export const deliverableService = {
  async submit(userId, collaborationId, payload, revisionOfId = null) {
    const collaboration = await deliverableRepository.findCollaboration(collaborationId);
    if (role(collaboration, userId) !== 'creator') {
      throw new AppError('Only the creator can submit deliverables.', 403, 'DELIVERABLE_FORBIDDEN');
    }
    const funded = collaboration.payments.some((payment) => payment.type === 'FUNDING' && payment.status === 'FUNDED');
    if (collaboration.status !== 'IN_PROGRESS' || !funded) {
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
      await tx.collaboration.update({ where: { id: collaborationId }, data: { progress: Math.max(collaboration.progress, 80) } });
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
    if (collaboration.status !== 'IN_PROGRESS') {
      throw new AppError('Deliverables cannot be reviewed now.', 409, 'DELIVERABLE_REVIEW_NOT_ALLOWED');
    }
    const target = collaboration.deliverables.find((entry) => entry.id === deliverableId);
    if (!target) throw new AppError('Deliverable was not found.', 404, 'DELIVERABLE_NOT_FOUND');
    if (!['SUBMITTED', 'IN_REVIEW'].includes(target.status)) {
      if (target.status === payload.decision) return { deliverable: toDeliverable(target), completed: collaboration.status === 'COMPLETED' };
      throw new AppError('This deliverable was already reviewed.', 409, 'DELIVERABLE_ALREADY_REVIEWED');
    }
    let release = null;
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
      const superseded = new Set(all.map((entry) => entry.revisionOfId).filter(Boolean));
      const latest = all.filter((entry) => !superseded.has(entry.id));
      const completed = latest.length > 0 && latest.every((entry) => entry.status === 'APPROVED');
      if (completed) {
        await tx.collaboration.update({
          where: { id: collaborationId },
          data: { status: 'COMPLETED', progress: 100, completedAt: new Date(), version: { increment: 1 } },
        });
        const funding = collaboration.payments.find((payment) => payment.type === 'FUNDING' && payment.status === 'FUNDED');
        const existingRelease = collaboration.payments.find((payment) => payment.type === 'MILESTONE_RELEASE');
        if (!existingRelease) {
          release = await tx.payment.create({
            data: {
              collaborationId,
              parentId: funding.id,
              type: 'MILESTONE_RELEASE',
              status: 'PENDING',
              amount: Number(funding.amount) - Number(funding.platformFee),
              currency: funding.currency,
              provider: funding.provider,
              providerRef: `mock_release_${crypto.randomUUID()}`,
            },
          });
        } else {
          release = existingRelease;
        }
        await tx.collaborationActivity.create({
          data: { collaborationId, type: 'COLLABORATION_COMPLETED', message: 'All latest deliverables are approved. The collaboration is complete.' },
        });
      }
      return { updated, completed };
    });
    if (release) release = await paymentPort.requestRelease(release, payload.autoConfirmRelease);
    return { deliverable: toDeliverable(result.updated), completed: result.completed, release: release ? { ...release, amount: Number(release.amount) } : null };
  },
};
