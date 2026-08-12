import { createHash } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { localMediaStorage } from './local-storage.adapter.js';
import { detectMedia } from './media.magic.js';
import { toMediaAsset } from './media.mapper.js';
import { mediaRepository } from './media.repository.js';
import { createMediaSignature, verifyMediaSignature } from './media.signing.js';

export const WORKSPACE_MEDIA_MAX_BYTES = 25 * 1024 * 1024;
export const WORKSPACE_MEDIA_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/quicktime', 'video/webm', 'application/pdf',
]);

export const mediaService = {
  async upload(ownerId, purpose, file) {
    if (!file?.buffer?.length) {
      throw new AppError('Choose a media file to upload.', 400, 'MEDIA_FILE_REQUIRED');
    }
    const detected = detectMedia(file.buffer);
    if (!detected) {
      throw new AppError('The file content does not match a supported media type.', 400, 'INVALID_MEDIA_SIGNATURE');
    }
    if (detected.mimeType !== file.mimetype
      && !(file.mimetype === 'video/quicktime' && detected.kind === 'VIDEO')
      && !(file.mimetype === 'audio/x-wav' && detected.mimeType === 'audio/wav')) {
      throw new AppError('The file extension and content type do not match.', 400, 'MEDIA_TYPE_MISMATCH');
    }
    const maxBytes = detected.kind === 'IMAGE'
      ? env.mediaMaxImageBytes
      : detected.kind === 'AUDIO'
        ? env.mediaMaxAudioBytes
      : detected.kind === 'DOCUMENT'
        ? env.mediaMaxDocumentBytes
        : env.mediaMaxVideoBytes;
    if (file.size > maxBytes) {
      throw new AppError(
        `The ${detected.kind.toLowerCase()} file is too large.`,
        400,
        'MEDIA_TOO_LARGE',
        { maxBytes },
      );
    }
    if (['AVATAR', 'COVER', 'LOGO'].includes(purpose) && detected.kind !== 'IMAGE') {
      throw new AppError('Avatar, cover, and logo uploads must be images.', 400, 'IMAGE_REQUIRED');
    }
    if (purpose === 'CAMPAIGN_BRIEF' && !['IMAGE', 'DOCUMENT'].includes(detected.kind)) {
      throw new AppError('A campaign brief must be an image or PDF document.', 400, 'CAMPAIGN_BRIEF_TYPE_INVALID');
    }

    const stored = await localMediaStorage.save({
      ownerId,
      extension: detected.extension,
      buffer: file.buffer,
    });
    try {
      const asset = await mediaRepository.create({
        ownerId,
        purpose,
        storageKey: stored.storageKey,
        url: stored.url,
        originalName: String(file.originalname || 'upload').slice(0, 255),
        mimeType: detected.mimeType,
        sizeBytes: file.size,
        checksum: createHash('sha256').update(file.buffer).digest('hex'),
      });
      return toMediaAsset(asset);
    } catch (error) {
      await localMediaStorage.remove(stored.storageKey);
      throw error;
    }
  },

  async requireOwned(ownerId, assetId, purpose) {
    const asset = await mediaRepository.findOwned(assetId, ownerId);
    if (!asset || (purpose && asset.purpose !== purpose)) {
      throw new AppError('The selected media asset is unavailable.', 404, 'MEDIA_NOT_FOUND');
    }
    return { ...asset, url: `/api/v1/media/assets/${asset.id}/content` };
  },

  async requireWorkspaceAsset(ownerId, assetId) {
    const asset = await mediaRepository.findOwned(assetId, ownerId);
    if (!asset || asset.purpose !== 'COLLABORATION') {
      throw new AppError('The selected workspace attachment is unavailable.', 404, 'WORKSPACE_MEDIA_NOT_FOUND');
    }
    if (!WORKSPACE_MEDIA_MIME_TYPES.has(asset.mimeType)) {
      throw new AppError('This file type is not allowed in a collaboration workspace.', 400, 'WORKSPACE_MEDIA_TYPE_INVALID');
    }
    if (asset.sizeBytes > WORKSPACE_MEDIA_MAX_BYTES) {
      throw new AppError('Workspace attachments cannot exceed 25 MB.', 400, 'WORKSPACE_MEDIA_TOO_LARGE');
    }
    return { ...asset, url: `/api/v1/media/assets/${asset.id}/content` };
  },

  async delivery(assetId, userId) {
    const asset = await mediaRepository.findForDelivery(assetId);
    if (!asset) throw new AppError('Media asset was not found.', 404, 'MEDIA_NOT_FOUND');
    const contentPosts = [
      ...asset.contentMedia.map((item) => item.post),
      ...asset.contentThumbnails.map((item) => item.post),
      ...asset.contentAudioPosts,
    ];
    const targets = contentPosts.map((post) => post.creatorId
      ? { targetType: 'CREATOR', targetId: post.creatorId }
      : { targetType: 'BUSINESS', targetId: post.businessId });
    const followed = await mediaRepository.follows(userId, targets);
    const followedKeys = new Set(followed.map((item) => `${item.targetType}:${item.targetId}`));
    const canViewFollowerContent = contentPosts.some((post) => {
      if (post.status !== 'PUBLISHED' || post.deletedAt) return false;
      const ownerId = post.creator?.userId || post.business?.userId;
      const key = post.creatorId ? `CREATOR:${post.creatorId}` : `BUSINESS:${post.businessId}`;
      return ownerId === userId || (post.visibility === 'FOLLOWERS' && followedKeys.has(key));
    });
    const campaigns = asset.campaignAttachments.map((item) => item.campaign);
    const isPublic = ['AVATAR', 'COVER', 'LOGO'].includes(asset.purpose)
      || (asset.purpose === 'PORTFOLIO' && asset.portfolioItems.some((item) => item.status === 'PUBLISHED'))
      || (asset.purpose === 'CONTENT' && [...asset.contentMedia, ...asset.contentThumbnails]
        .some((item) => item.post.status === 'PUBLISHED' && item.post.visibility === 'PUBLIC' && !item.post.deletedAt))
      || (asset.purpose === 'CONTENT' && asset.contentAudioPosts
        .some((post) => post.status === 'PUBLISHED' && post.visibility === 'PUBLIC' && !post.deletedAt))
      || (asset.purpose === 'CAMPAIGN_BRIEF' && campaigns.some((campaign) => campaign.isPublic && campaign.status === 'OPEN'))
      || canViewFollowerContent;
    const collaborations = [
      ...asset.collaborationFiles.map((item) => item.collaboration),
      ...asset.deliverables.map((item) => item.collaboration),
      ...campaigns.flatMap((campaign) => campaign.collaborations),
    ];
    const participant = userId && collaborations.some((item) =>
      item.business.userId === userId || item.creator.userId === userId);
    if (!isPublic && asset.ownerId !== userId && !participant) {
      throw new AppError('Media asset was not found.', 404, 'MEDIA_NOT_FOUND');
    }
    return { path: localMediaStorage.resolve(asset.storageKey), mimeType: asset.mimeType, originalName: asset.originalName };
  },

  async remove(ownerId, assetId) {
    const asset = await mediaRepository.findOwned(assetId, ownerId);
    if (!asset) throw new AppError('Media asset was not found.', 404, 'MEDIA_NOT_FOUND');
    const removed = await mediaRepository.softDeleteOwned(assetId, ownerId);
    if (removed.count !== 1) {
      throw new AppError('Media used by an active portfolio item cannot be deleted.', 409, 'MEDIA_IN_USE');
    }
    await localMediaStorage.remove(asset.storageKey);
    return null;
  },
  async signedDownload(userId, assetId) {
    await this.delivery(assetId, userId);
    const expires = Math.floor(Date.now() / 1000) + env.mediaSignedUrlTtlSeconds;
    const input = { action: 'download', assetId, ownerId: userId, expires };
    const signature = createMediaSignature(input);
    return { url: `/api/v1/media/assets/${assetId}/signed-content?subject=${userId}&expires=${expires}&signature=${signature}`, expiresAt: new Date(expires * 1000) };
  },
  async signedDelivery(assetId, subject, expires, signature) {
    verifyMediaSignature({ action: 'download', assetId, ownerId: subject, expires }, signature);
    return this.delivery(assetId, subject);
  },
  signedUpload(userId, purpose) {
    const expires = Math.floor(Date.now() / 1000) + env.mediaSignedUrlTtlSeconds;
    const input = { action: 'upload', ownerId: userId, purpose, expires };
    const signature = createMediaSignature(input);
    return { url: `/api/v1/media/signed-uploads/${userId}?purpose=${purpose}&expires=${expires}&signature=${signature}`, method: 'POST', field: 'file', expiresAt: new Date(expires * 1000) };
  },
  async uploadSigned(ownerId, purpose, expires, signature, file) {
    verifyMediaSignature({ action: 'upload', ownerId, purpose, expires }, signature);
    return this.upload(ownerId, purpose, file);
  },
};
