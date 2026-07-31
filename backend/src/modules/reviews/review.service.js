import { AppError } from '../../shared/errors/AppError.js';
import { reviewRepository } from './review.repository.js';

function role(collaboration, userId) {
  if (!collaboration) throw new AppError('Collaboration was not found.', 404, 'COLLABORATION_NOT_FOUND');
  if (collaboration.business.userId === userId) return 'business';
  if (collaboration.creator.userId === userId) return 'creator';
  throw new AppError('Collaboration was not found.', 404, 'COLLABORATION_NOT_FOUND');
}

const map = (review) => ({
  id: review.id,
  collaborationId: review.collaborationId,
  reviewerId: review.reviewerId,
  subjectId: review.subjectId,
  rating: review.rating,
  comment: review.comment,
  publishedAt: review.publishedAt,
  createdAt: review.createdAt,
});

export const reviewService = {
  async submit(userId, collaborationId, payload) {
    const collaboration = await reviewRepository.findCollaboration(collaborationId);
    const actor = role(collaboration, userId);
    if (collaboration.status !== 'COMPLETED') {
      throw new AppError('Reviews are available after collaboration completion.', 409, 'EARLY_REVIEW_NOT_ALLOWED');
    }
    const subjectId = actor === 'business' ? collaboration.creator.userId : collaboration.business.userId;
    const existing = collaboration.reviews.find((entry) => entry.reviewerId === userId);
    if (existing) return map(existing);
    return map(await reviewRepository.transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          collaborationId,
          reviewerId: userId,
          subjectId,
          rating: payload.rating,
          comment: payload.comment || null,
          publishedAt: new Date(),
        },
      });
      const aggregate = await tx.review.aggregate({
        where: { subjectId, publishedAt: { not: null } },
        _avg: { rating: true },
        _count: { rating: true },
      });
      if (actor === 'business') {
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
      await tx.collaborationActivity.create({
        data: {
          collaborationId,
          actorId: userId,
          type: 'REVIEW_PUBLISHED',
          message: `${actor === 'creator' ? 'Creator' : 'Business'} left a ${payload.rating}-star review.`,
          metadata: { reviewId: review.id },
        },
      });
      return review;
    }));
  },

  async list(userId, collaborationId) {
    const collaboration = await reviewRepository.findCollaboration(collaborationId);
    role(collaboration, userId);
    return collaboration.reviews.map(map);
  },

  async publishShowcase(userId, collaborationId, payload) {
    const collaboration = await reviewRepository.findCollaboration(collaborationId);
    if (role(collaboration, userId) !== 'business') {
      throw new AppError('Only the business can publish this collaboration.', 403, 'SHOWCASE_PUBLISH_FORBIDDEN');
    }
    if (collaboration.status !== 'COMPLETED' || collaboration.reviews.length < 2) {
      throw new AppError('Both reviews are required before showcase publishing.', 409, 'SHOWCASE_NOT_READY');
    }
    if (collaboration.showcasePost) return collaboration.showcasePost;
    const media = collaboration.deliverables.find((entry) => entry.status === 'APPROVED');
    if (!media) throw new AppError('An approved deliverable is required.', 409, 'SHOWCASE_MEDIA_REQUIRED');
    const fileType = (media.fileType || '').toLowerCase();
    const mediaType = fileType.includes('video') ? 'VIDEO' : fileType.includes('image') ? 'IMAGE' : 'DOCUMENT';
    return reviewRepository.transaction(async (tx) => {
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
          message: 'Business published this collaboration to Showcase.',
          metadata: { showcaseId: post.id },
        },
      });
      await tx.outboxEvent.create({
        data: { topic: 'showcase.published', aggregateId: post.id, payload: { showcaseId: post.id, collaborationId } },
      });
      return post;
    });
  },
};
