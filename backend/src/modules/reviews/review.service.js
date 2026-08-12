import { AppError } from '../../shared/errors/AppError.js';
import { reviewRepository } from './review.repository.js';
import { verifyPublicationProof } from './publish-proof.provider.js';

const REVIEW_REVEAL_WINDOW_DAYS = 14;

function role(collaboration, userId) {
  if (!collaboration) throw new AppError('Collaboration was not found.', 404, 'COLLABORATION_NOT_FOUND');
  if (collaboration.business.userId === userId) return 'business';
  if (collaboration.creator.userId === userId) return 'creator';
  throw new AppError('Collaboration was not found.', 404, 'COLLABORATION_NOT_FOUND');
}

// A review stays hidden (publishedAt: null) until the counterpart also reviews — this is the
// "simultaneous reveal" required by FR-7.2, so neither side can read (and react to) the other's
// rating before writing their own. You can always read your own review regardless of reveal state.
const map = (review, viewerId) => {
  const revealed = Boolean(review.publishedAt);
  const visible = revealed || review.reviewerId === viewerId;
  return {
    id: review.id,
    collaborationId: review.collaborationId,
    reviewerId: review.reviewerId,
    subjectId: review.subjectId,
    rating: visible ? review.rating : null,
    comment: visible ? review.comment : null,
    revealed,
    publishedAt: review.publishedAt,
    createdAt: review.createdAt,
  };
};

async function refreshSubjectAggregate(tx, collaboration, subjectId) {
  const aggregate = await tx.review.aggregate({
    where: { subjectId, publishedAt: { not: null } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  if (subjectId === collaboration.creator.userId) {
    await tx.creatorProfile.update({
      where: { id: collaboration.creator.id },
      data: { ratingAverage: aggregate._avg.rating, ratingCount: aggregate._count.rating },
    });
  } else {
    await tx.businessProfile.update({
      where: { id: collaboration.business.id },
      data: { ratingAverage: aggregate._avg.rating, ratingCount: aggregate._count.rating },
    });
  }
}

export const reviewService = {
  async submit(userId, collaborationId, payload) {
    const collaboration = await reviewRepository.findCollaboration(collaborationId);
    const actor = role(collaboration, userId);
    if (collaboration.status !== 'COMPLETED') {
      throw new AppError('Reviews are available after collaboration completion.', 409, 'EARLY_REVIEW_NOT_ALLOWED');
    }
    const subjectId = actor === 'business' ? collaboration.creator.userId : collaboration.business.userId;
    const existing = collaboration.reviews.find((entry) => entry.reviewerId === userId);
    if (existing) return map(existing, userId);
    const counterpart = collaboration.reviews.find((entry) => entry.reviewerId !== userId) || null;
    const mutualReveal = Boolean(counterpart);
    const review = await reviewRepository.transaction(async (tx) => {
      const now = new Date();
      const created = await tx.review.create({
        data: {
          collaborationId,
          reviewerId: userId,
          subjectId,
          rating: payload.rating,
          comment: payload.comment || null,
          publishedAt: mutualReveal ? now : null,
        },
      });
      if (mutualReveal) {
        await tx.review.update({ where: { id: counterpart.id }, data: { publishedAt: now } });
        await refreshSubjectAggregate(tx, collaboration, subjectId);
        await refreshSubjectAggregate(tx, collaboration, counterpart.subjectId);
      }
      await tx.collaborationActivity.create({
        data: {
          collaborationId,
          actorId: userId,
          type: 'REVIEW_PUBLISHED',
          message: mutualReveal
            ? 'Both collaboration reviews are now revealed to each other.'
            : `${actor === 'creator' ? 'Creator' : 'Business'} submitted a review — it stays hidden until the other party reviews too.`,
          metadata: { reviewId: created.id },
        },
      });
      if (mutualReveal) {
        await tx.outboxEvent.create({
          data: { topic: 'collaboration.review_revealed', aggregateId: collaborationId, payload: { collaborationId, actorId: userId } },
        });
      }
      return created;
    });
    return map(review, userId);
  },

  async list(userId, collaborationId) {
    const collaboration = await reviewRepository.findCollaboration(collaborationId);
    role(collaboration, userId);
    return collaboration.reviews.map((review) => map(review, userId));
  },

  async giveShowcaseConsent(userId, collaborationId, payload) {
    const collaboration = await reviewRepository.findCollaboration(collaborationId);
    const actor = role(collaboration, userId);
    if (collaboration.status !== 'COMPLETED' || collaboration.reviews.length < 2) {
      throw new AppError('Both reviews are required before showcase consent can be given.', 409, 'SHOWCASE_NOT_READY');
    }
    if (collaboration.showcasePost) return { post: collaboration.showcasePost, status: 'PUBLISHED' };
    const counterpartDeclined = collaboration.showcaseConsents
      .some((entry) => entry.userId !== userId && entry.decision === 'DECLINED');
    if (counterpartDeclined) {
      throw new AppError('The other participant declined to publish this collaboration to Showcase.', 409, 'SHOWCASE_DECLINED');
    }
    const counterpartUserId = actor === 'business' ? collaboration.creator.userId : collaboration.business.userId;
    const counterpartApproved = collaboration.showcaseConsents
      .some((entry) => entry.userId === counterpartUserId && entry.decision === 'APPROVED');

    return reviewRepository.transaction(async (tx) => {
      await tx.showcaseConsent.upsert({
        where: { collaborationId_userId: { collaborationId, userId } },
        create: { collaborationId, userId, decision: 'APPROVED', decidedAt: new Date() },
        update: { decision: 'APPROVED', decidedAt: new Date() },
      });
      if (!counterpartApproved) {
        await tx.collaborationActivity.create({
          data: {
            collaborationId,
            actorId: userId,
            type: 'SHOWCASE_CONSENT_GIVEN',
            message: `${actor === 'creator' ? 'Creator' : 'Business'} approved sharing this collaboration on Showcase — waiting for the other participant.`,
          },
        });
        await tx.outboxEvent.create({
          data: { topic: 'collaboration.showcase_consent_requested', aggregateId: collaborationId, payload: { collaborationId, actorId: userId } },
        });
        return { post: null, status: 'WAITING_FOR_COUNTERPART' };
      }
      const media = collaboration.deliverables.find((entry) => entry.status === 'APPROVED');
      if (!media) throw new AppError('An approved deliverable is required.', 409, 'SHOWCASE_MEDIA_REQUIRED');
      const fileType = (media.fileType || '').toLowerCase();
      const mediaType = fileType.includes('video') ? 'VIDEO' : fileType.includes('image') ? 'IMAGE' : 'DOCUMENT';
      const post = await tx.showcasePost.create({
        data: {
          collaborationId,
          creatorId: collaboration.creator.id,
          title: payload.title || collaboration.campaign?.title || media.title,
          description: payload.description || media.note,
          category: payload.category || collaboration.campaign?.category || 'Creator collaboration',
          mediaType,
          mediaUrl: media.fileUrl,
          thumbnailUrl: payload.thumbnailUrl || null,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });
      await tx.collaborationActivity.create({
        data: {
          collaborationId,
          actorId: userId,
          type: 'SHOWCASE_PUBLISHED',
          message: 'Both participants approved sharing this collaboration — it is now published to Showcase.',
          metadata: { showcaseId: post.id },
        },
      });
      await tx.outboxEvent.create({
        data: { topic: 'showcase.published', aggregateId: post.id, payload: { showcaseId: post.id, collaborationId } },
      });
      return { post, status: 'PUBLISHED' };
    });
  },

  async declineShowcaseConsent(userId, collaborationId) {
    const collaboration = await reviewRepository.findCollaboration(collaborationId);
    const actor = role(collaboration, userId);
    if (collaboration.status !== 'COMPLETED') {
      throw new AppError('Showcase consent is available after collaboration completion.', 409, 'SHOWCASE_NOT_READY');
    }
    if (collaboration.showcasePost) {
      throw new AppError('This collaboration is already published to Showcase.', 409, 'SHOWCASE_ALREADY_PUBLISHED');
    }
    await reviewRepository.transaction(async (tx) => {
      await tx.showcaseConsent.upsert({
        where: { collaborationId_userId: { collaborationId, userId } },
        create: { collaborationId, userId, decision: 'DECLINED', decidedAt: new Date() },
        update: { decision: 'DECLINED', decidedAt: new Date() },
      });
      await tx.collaborationActivity.create({
        data: {
          collaborationId,
          actorId: userId,
          type: 'SHOWCASE_CONSENT_DECLINED',
          message: `${actor === 'creator' ? 'Creator' : 'Business'} declined to publish this collaboration to Showcase.`,
        },
      });
      await tx.outboxEvent.create({
        data: { topic: 'collaboration.showcase_declined', aggregateId: collaborationId, payload: { collaborationId, actorId: userId } },
      });
    });
    return { status: 'DECLINED' };
  },

  // Background sweep (called from the collaboration lifecycle job): a review left unrevealed
  // forever would trap the reviewer's feedback and starve both profiles' rating aggregates, so
  // force-reveal it once the counterpart has had a fair window — mirrors the 14-day model used by
  // Airbnb/Upwork-style double-blind reviews.
  async revealStale(now = new Date()) {
    let revealed = 0;
    for (const collaboration of await reviewRepository.staleUnrevealed(now, REVIEW_REVEAL_WINDOW_DAYS)) {
      const pending = collaboration.reviews.filter((review) => !review.publishedAt);
      if (!pending.length) continue;
      await reviewRepository.transaction(async (tx) => {
        await tx.review.updateMany({ where: { id: { in: pending.map((entry) => entry.id) } }, data: { publishedAt: now } });
        const subjectIds = [...new Set(pending.map((entry) => entry.subjectId))];
        for (const subjectId of subjectIds) await refreshSubjectAggregate(tx, collaboration, subjectId);
        await tx.collaborationActivity.create({
          data: {
            collaborationId: collaboration.id,
            type: 'REVIEW_PUBLISHED',
            message: 'A pending review was automatically revealed after the 14-day reveal window closed.',
          },
        });
        await tx.outboxEvent.create({
          data: { topic: 'collaboration.review_revealed', aggregateId: collaboration.id, payload: { collaborationId: collaboration.id } },
        });
      });
      revealed += pending.length;
    }
    return revealed;
  },

  async listProofs(userId, collaborationId) {
    const collaboration = await reviewRepository.findCollaboration(collaborationId);
    role(collaboration, userId);
    return collaboration.publishProofs.map(mapProof);
  },
  async submitProof(userId, collaborationId, payload) {
    const collaboration = await reviewRepository.findCollaboration(collaborationId);
    if (role(collaboration, userId) !== 'creator') throw new AppError('Only the creator can submit publication proof.', 403, 'PROOF_FORBIDDEN');
    if (!['IN_REVIEW', 'PUBLISHED', 'COMPLETED'].includes(collaboration.status)) throw new AppError('Approved deliverables are required before publication proof.', 409, 'PROOF_NOT_ALLOWED');
    if (collaboration.contract?.disclosureRequired && !payload.paidPartnership) {
      throw new AppError('This contract requires a paid partnership disclosure on the published post.', 409, 'PARTNERSHIP_DISCLOSURE_REQUIRED');
    }
    const socialAccount = payload.socialAccountId ? await reviewRepository.socialAccount(payload.socialAccountId, collaboration.creator.id) : null;
    const verification = await verifyPublicationProof({ postUrl: payload.postUrl, providerPostId: payload.providerPostId, socialAccount });
    const publishedAt = payload.publishedAt || new Date();
    const verifiedAt = verification.verified && verification.live ? new Date() : null;
    const retentionDueAt = verifiedAt ? new Date(publishedAt.getTime() + (collaboration.contract?.retentionDays || 30) * 86400000) : null;
    const settlementDueAt = verifiedAt && collaboration.status !== 'COMPLETED'
      ? new Date(verifiedAt.getTime() + (collaboration.contract?.disputeWindowDays || 7) * 86400000)
      : null;
    const proof = await reviewRepository.transaction(async (tx) => {
      const deliverable = await tx.deliverable.findFirst({ where: { id: payload.deliverableId, collaborationId, status: 'APPROVED' } });
      if (!deliverable) throw new AppError('An approved deliverable is required.', 409, 'PROOF_DELIVERABLE_REQUIRED');
      if (payload.screenshotId) {
        const screenshot = await tx.mediaAsset.findFirst({ where: { id: payload.screenshotId, ownerId: userId, purpose: 'DELIVERABLE', deletedAt: null } });
        if (!screenshot) throw new AppError('Proof screenshot was not found.', 404, 'PROOF_SCREENSHOT_NOT_FOUND');
      }
      if (payload.socialAccountId && !socialAccount) throw new AppError('Social account was not found.', 404, 'SOCIAL_ACCOUNT_NOT_FOUND');
      const { paidPartnership, ...proofPayload } = payload;
      const created = await tx.publishProof.create({ data: {
        collaborationId, submittedById: userId, ...proofPayload, publishedAt,
        status: verifiedAt ? 'RETENTION_PENDING' : 'VERIFYING',
        verifiedAt, retentionDueAt, lastCheckedAt: verifiedAt,
        metrics: { ...(verification.metrics || {}), paidPartnershipDisclosure: paidPartnership },
        failureReason: verification.available && !verification.live ? 'Provider reports that the post is unavailable.' : null,
      } });
      if (verifiedAt) await tx.publishProofMetricSnapshot.create({ data: { proofId: created.id, ...(verification.metrics || {}), isLive: true, source: verification.source } });
      if (collaboration.status !== 'COMPLETED') {
        await tx.collaboration.update({ where: { id: collaborationId }, data: { status: verifiedAt ? 'PROVEN' : 'PUBLISHED', progress: verifiedAt ? 95 : 92, settlementDueAt } });
      }
      await tx.collaborationActivity.create({ data: { collaborationId, actorId: userId, type: 'PUBLISH_PROOF_SUBMITTED', message: `Publication proof was submitted for ${deliverable.title}.`, metadata: { proofId: created.id, deliverableId: deliverable.id } } });
      await tx.outboxEvent.create({ data: { topic: 'proof.submitted', aggregateId: created.id, payload: { proofId: created.id, collaborationId, actorId: userId } } });
      return created;
    });
    return mapProof(proof);
  },
  async moderateProof(actorId, proofId, payload, ipAddress) {
    return reviewRepository.transaction(async (tx) => {
      const before = await tx.publishProof.findUnique({ where: { id: proofId }, include: { collaboration: { include: { contract: true } } } });
      if (!before) throw new AppError('Publication proof was not found.', 404, 'PROOF_NOT_FOUND');
      if (before.status !== 'VERIFYING') throw new AppError('This proof no longer requires manual review.', 409, 'PROOF_REVIEW_NOT_ALLOWED');
      const approved = payload.action === 'APPROVE';
      const now = new Date();
      const retentionDueAt = approved ? new Date(before.publishedAt.getTime() + (before.collaboration.contract?.retentionDays || 30) * 86400000) : null;
      const settlementDueAt = approved && before.collaboration.status !== 'COMPLETED'
        ? new Date(now.getTime() + (before.collaboration.contract?.disputeWindowDays || 7) * 86400000)
        : null;
      const proof = await tx.publishProof.update({ where: { id: proofId }, data: approved ? { status: 'RETENTION_PENDING', verifiedAt: now, lastCheckedAt: now, retentionDueAt, failureReason: null } : { status: 'REJECTED', failureReason: payload.reason } });
      if (approved) {
        await tx.publishProofMetricSnapshot.create({ data: { proofId, isLive: true, source: 'admin-manual-review' } });
        if (before.collaboration.status !== 'COMPLETED') {
          await tx.collaboration.update({ where: { id: before.collaborationId }, data: { status: 'PROVEN', progress: 95, settlementDueAt } });
        }
      }
      await tx.adminAction.create({ data: { actorId, action: approved ? 'PUBLISH_PROOF_APPROVED' : 'PUBLISH_PROOF_REJECTED', targetType: 'PUBLISH_PROOF', targetId: proofId, reason: payload.reason, before: { status: before.status }, after: { status: proof.status }, ipAddress } });
      await tx.outboxEvent.create({ data: { topic: approved ? 'proof.verified' : 'proof.rejected', aggregateId: proofId, payload: { proofId, collaborationId: before.collaborationId } } });
      return mapProof(proof);
    });
  },
};

function mapProof(proof) {
  return { id: proof.id, collaborationId: proof.collaborationId, deliverableId: proof.deliverableId, postUrl: proof.postUrl, platform: proof.platform, status: proof.status, paidPartnership: Boolean(proof.metrics?.paidPartnershipDisclosure), metrics: proof.metrics, providerPostId: proof.providerPostId, publishedAt: proof.publishedAt, verifiedAt: proof.verifiedAt, retentionDueAt: proof.retentionDueAt, lastCheckedAt: proof.lastCheckedAt, failureReason: proof.failureReason, createdAt: proof.createdAt };
}
