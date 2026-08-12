import { AppError } from '../../shared/errors/AppError.js';
import { toContentPost } from './content.mapper.js';
import { assertPostCanPublish, canReadPost } from './content.policy.js';
import { contentRepository } from './content.repository.js';
import { realtimeGateway } from '../../infrastructure/realtime/realtime.gateway.js';
import { assertFeatureEnabled } from '../operations/platform-config.service.js';

const missing = () => new AppError('Content post was not found.', 404, 'CONTENT_NOT_FOUND');
const channelMissing = () => new AppError('Create the selected channel before publishing content.', 409, 'CONTENT_CHANNEL_REQUIRED');
const STORY_TTL_MS = 24 * 60 * 60 * 1000;

const storyExpiresAt = (from = new Date()) => new Date(from.getTime() + STORY_TTL_MS);

const mapMedia = (items) => items.map((item, index) => ({
  mediaAssetId: item.assetId,
  thumbnailAssetId: item.thumbnailAssetId || null,
  mediaType: item.mediaType,
  sortOrder: index,
  altText: item.altText || null,
  width: item.width,
  height: item.height,
  durationMs: item.durationMs,
}));

async function validateMedia(userId, media) {
  const ids = [...new Set(media.flatMap((item) => [item.assetId, item.thumbnailAssetId].filter(Boolean)))];
  if (!ids.length) return;
  const assets = await contentRepository.findMediaAssets(userId, ids);
  if (assets.length !== ids.length) {
    throw new AppError('One or more content media assets are unavailable.', 404, 'CONTENT_MEDIA_NOT_FOUND');
  }
  const byId = new Map(assets.map((item) => [item.id, item]));
  for (const item of media) {
    const mime = byId.get(item.assetId)?.mimeType || '';
    if ((item.mediaType === 'IMAGE' && !mime.startsWith('image/')) || (item.mediaType === 'VIDEO' && !mime.startsWith('video/'))) {
      throw new AppError('The declared media type does not match the uploaded file.', 400, 'CONTENT_MEDIA_TYPE_MISMATCH');
    }
  }
}

async function validateStoryAudio(userId, storyAudio, postType) {
  if (!storyAudio) return;
  if (postType !== 'STORY') throw new AppError('Audio tracks can only be attached to stories.', 409, 'STORY_AUDIO_ONLY');
  if (storyAudio.rightsConfirmed !== true) {
    throw new AppError('Confirm that you have permission to use this audio.', 409, 'STORY_AUDIO_RIGHTS_REQUIRED');
  }
  const asset = await contentRepository.findMediaAsset(userId, storyAudio.assetId);
  if (!asset || !asset.mimeType.startsWith('audio/')) {
    throw new AppError('The selected story audio is unavailable.', 404, 'STORY_AUDIO_NOT_FOUND');
  }
}

const storyAudioData = (storyAudio) => storyAudio ? {
  audioAssetId: storyAudio.assetId,
  audioTitle: storyAudio.title,
  audioArtist: storyAudio.artist || null,
  audioStartMs: storyAudio.startMs,
  audioVolume: storyAudio.volume,
  audioRightsConfirmedAt: new Date(),
} : {
  audioAssetId: null,
  audioTitle: null,
  audioArtist: null,
  audioStartMs: 0,
  audioVolume: null,
  audioRightsConfirmedAt: null,
};

async function validateReferences(author, payload) {
  let collaboration = null;
  if (payload.campaignId) {
    const campaign = await contentRepository.findCampaign(payload.campaignId);
    if (!campaign || (author.authorType === 'BUSINESS' && campaign.businessId !== author.id)) {
      throw new AppError('The selected campaign is unavailable for this channel.', 404, 'CONTENT_CAMPAIGN_NOT_FOUND');
    }
  }
  if (payload.portfolioItemId) {
    const portfolio = await contentRepository.findPortfolio(payload.portfolioItemId);
    if (!portfolio || author.authorType !== 'CREATOR' || portfolio.creatorId !== author.id || portfolio.status !== 'PUBLISHED') {
      throw new AppError('The selected portfolio item is unavailable for this channel.', 404, 'CONTENT_PORTFOLIO_NOT_FOUND');
    }
  }
  if (payload.collaborationId) {
    collaboration = await contentRepository.findCollaboration(payload.collaborationId);
    const participant = collaboration && (collaboration.creatorId === author.id || collaboration.businessId === author.id);
    if (!participant) throw new AppError('The selected collaboration is unavailable for this channel.', 404, 'CONTENT_COLLABORATION_NOT_FOUND');
  }
  if (payload.partnerCreatorId) {
    const partner = await contentRepository.findCreator(payload.partnerCreatorId);
    if (!partner || (author.authorType === 'CREATOR' && partner.id === author.id)) {
      throw new AppError('The selected creator partner is unavailable.', 404, 'CONTENT_PARTNER_NOT_FOUND');
    }
  }
  if (payload.partnerBusinessId) {
    const partner = await contentRepository.findBusiness(payload.partnerBusinessId);
    if (!partner || (author.authorType === 'BUSINESS' && partner.id === author.id)) {
      throw new AppError('The selected business partner is unavailable.', 404, 'CONTENT_PARTNER_NOT_FOUND');
    }
  }
  return { collaboration };
}

export function assertRequiredDisclosure(payload, collaboration) {
  if (payload.status === 'PUBLISHED' && collaboration?.contract?.disclosureRequired && !payload.paidPartnership) {
    throw new AppError('This collaboration contract requires a paid partnership disclosure.', 409, 'PARTNERSHIP_DISCLOSURE_REQUIRED');
  }
}

function dataFrom(payload, author) {
  const publishedAt = payload.status === 'PUBLISHED' ? new Date() : null;
  return {
    authorType: author.authorType,
    creatorId: author.authorType === 'CREATOR' ? author.id : null,
    businessId: author.authorType === 'BUSINESS' ? author.id : null,
    postType: payload.postType,
    title: payload.title || null,
    caption: payload.caption,
    storyStyle: payload.postType === 'STORY' ? payload.storyStyle || null : null,
    ...storyAudioData(payload.postType === 'STORY' ? payload.storyAudio : null),
    category: payload.category || null,
    visibility: payload.visibility,
    status: payload.status,
    campaignId: payload.campaignId || null,
    portfolioItemId: payload.portfolioItemId || null,
    collaborationId: payload.collaborationId || null,
    paidPartnership: payload.paidPartnership,
    partnerCreatorId: payload.partnerCreatorId || null,
    partnerBusinessId: payload.partnerBusinessId || null,
    publishedAt,
    expiresAt: payload.postType === 'STORY' && publishedAt ? storyExpiresAt(publishedAt) : null,
  };
}

export const contentService = {
  async feed(filters, viewer = null) {
    const userId = viewer?.id || null;
    const section = filters.section || (filters.mode === 'following' ? 'following' : 'recommended');
    if (section === 'following' && !userId) throw new AppError('Sign in to view followed channels.', 401, 'AUTH_REQUIRED');
    const result = await contentRepository.list({
      ...filters,
      section,
      mode: section === 'following' ? 'following' : 'for_you',
      hideCampaigns: !viewer?.roles?.includes('CREATOR'),
    }, userId);
    const state = await contentRepository.viewerState(userId, result.items.map((item) => item.id), result.followed);
    return { items: result.items.map((item) => toContentPost(item, state)), nextCursor: result.nextCursor, section };
  },

  async get(id, userId = null) {
    const post = await contentRepository.findById(id);
    if (!post) throw missing();
    if (await contentRepository.isHidden(userId, post)) throw missing();
    const followed = await contentRepository.followed(userId);
    const followingKeys = new Set(followed.map((item) => `${item.targetType}:${item.targetId}`));
    if (!canReadPost(post, userId, followingKeys)) throw missing();
    const state = await contentRepository.viewerState(userId, [id], followed);
    return toContentPost(post, state);
  },

  async channel(authorType, authorId, filters, userId = null) {
    if (await contentRepository.isChannelHidden(userId, authorType, authorId)) throw missing();
    const result = await contentRepository.listChannel(authorType, authorId, filters);
    const followed = await contentRepository.followed(userId);
    const state = await contentRepository.viewerState(userId, result.items.map((item) => item.id), followed);
    return { items: result.items.map((item) => toContentPost(item, state)), nextCursor: result.nextCursor };
  },

  async mine(userId, filters) {
    const result = await contentRepository.listMine(userId, filters);
    const state = await contentRepository.viewerState(userId, result.items.map((item) => item.id), []);
    return { items: result.items.map((item) => toContentPost(item, state)), nextCursor: result.nextCursor };
  },

  async create(userId, payload) {
    if (payload.status === 'PUBLISHED') await assertFeatureEnabled('content_publishing', { id: userId, roles: [payload.authorType] });
    const profile = await contentRepository.findAuthor(userId, payload.authorType);
    if (!profile) throw channelMissing();
    const author = { ...profile, authorType: payload.authorType };
    await validateMedia(userId, payload.media);
    await validateStoryAudio(userId, payload.storyAudio, payload.postType);
    const references = await validateReferences(author, payload);
    assertRequiredDisclosure(payload, references.collaboration);
    if (payload.status === 'PUBLISHED') {
      assertPostCanPublish({ ...payload, campaignId: payload.campaignId || null, media: payload.media });
    }
    const post = await contentRepository.create(dataFrom(payload, author), mapMedia(payload.media));
    return toContentPost(post);
  },

  async update(userId, id, payload) {
    const current = await contentRepository.findOwned(id, userId);
    if (!current) throw missing();
    if (current.status === 'REMOVED') throw missing();
    if (payload.media) await validateMedia(userId, payload.media);
    const nextPostType = payload.postType || current.postType;
    if (payload.storyAudio !== undefined) await validateStoryAudio(userId, payload.storyAudio, nextPostType);
    const author = { id: current.creatorId || current.businessId, authorType: current.authorType };
    await validateReferences(author, { ...current, ...payload });
    const { media, storyAudio, ...data } = payload;
    if (storyAudio !== undefined) Object.assign(data, storyAudioData(storyAudio));
    if (data.postType === 'STORY' && current.status === 'PUBLISHED' && !current.expiresAt) data.expiresAt = storyExpiresAt();
    if (data.postType && data.postType !== 'STORY') {
      data.expiresAt = null;
      Object.assign(data, storyAudioData(null));
    }
    return toContentPost(await contentRepository.update(id, data, media ? mapMedia(media) : null));
  },

  async publish(userId, id) {
    await assertFeatureEnabled('content_publishing', { id: userId, roles: [] });
    const post = await contentRepository.findOwned(id, userId);
    if (!post) throw missing();
    const collaboration = post.collaborationId ? await contentRepository.findCollaboration(post.collaborationId) : null;
    assertRequiredDisclosure({ ...post, status: 'PUBLISHED' }, collaboration);
    assertPostCanPublish(post);
    const now = new Date();
    const data = { status: 'PUBLISHED', publishedAt: post.publishedAt || now, archivedAt: null };
    if (post.postType === 'STORY') {
      const currentExpiry = post.expiresAt ? new Date(post.expiresAt) : null;
      data.expiresAt = currentExpiry && currentExpiry > now ? currentExpiry : storyExpiresAt(now);
    }
    return toContentPost(await contentRepository.update(id, data, null));
  },

  async archive(userId, id) {
    const post = await contentRepository.findOwned(id, userId);
    if (!post) throw missing();
    return toContentPost(await contentRepository.update(id, { status: 'ARCHIVED', archivedAt: new Date() }, null));
  },

  async remove(userId, id) {
    const post = await contentRepository.findOwned(id, userId);
    if (!post) throw missing();
    await contentRepository.update(id, { status: 'REMOVED', deletedAt: new Date(), archivedAt: new Date() }, null);
    return null;
  },

  async like(userId, id) {
    const post = await contentRepository.findById(id);
    if (!post || post.status !== 'PUBLISHED' || post.deletedAt) throw missing();
    if (await contentRepository.isHidden(userId, post)) throw missing();
    await contentRepository.like(userId, id);
    const actor = await contentRepository.findUser(userId);
    const notification = await contentRepository.createLikeNotification(post, actor);
    if (notification) realtimeGateway.user(notification.userId, 'notification:created', notification);
    return this.get(id, userId);
  },

  async unlike(userId, id) {
    const post = await contentRepository.findById(id);
    if (!post || post.status !== 'PUBLISHED' || post.deletedAt) throw missing();
    await contentRepository.unlike(userId, id);
    return this.get(id, userId);
  },
};
