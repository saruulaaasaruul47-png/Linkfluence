import { AppError } from '../../shared/errors/AppError.js';

export function assertPostOwner(post, userId) {
  const ownerId = post.creator?.userId || post.business?.userId;
  if (!ownerId || ownerId !== userId) {
    throw new AppError('Content post was not found.', 404, 'CONTENT_NOT_FOUND');
  }
}

export function assertPostCanPublish(post) {
  const hasMedia = (post.media?.length || 0) > 0;
  const hasStoryCanvas = post.postType === 'STORY' && Boolean(post.storyStyle?.background) && Boolean(post.caption?.trim());
  if (post.postType === 'STORY' && !hasMedia && !hasStoryCanvas) {
    throw new AppError('Add an image, video, or styled text before publishing a story.', 409, 'STORY_CONTENT_REQUIRED');
  }
  if (!hasMedia && !hasStoryCanvas && !post.campaignId) {
    throw new AppError('Add media or link a campaign before publishing.', 409, 'CONTENT_MEDIA_REQUIRED');
  }
  if (post.paidPartnership && !post.partnerBusinessId && !post.partnerCreatorId && !post.campaignId) {
    throw new AppError('Paid partnership content must identify a partner or campaign.', 409, 'PARTNERSHIP_DISCLOSURE_REQUIRED');
  }
}

export function canReadPost(post, userId, followingKeys = new Set()) {
  if (post.status !== 'PUBLISHED' || post.deletedAt) return false;
  const ownerId = post.creator?.userId || post.business?.userId;
  if (post.expiresAt && new Date(post.expiresAt) <= new Date() && (!userId || ownerId !== userId)) return false;
  if (post.visibility === 'PUBLIC') return true;
  if (userId && ownerId === userId) return true;
  const key = post.authorType === 'CREATOR'
    ? `CREATOR:${post.creatorId}`
    : `BUSINESS:${post.businessId}`;
  return followingKeys.has(key);
}
