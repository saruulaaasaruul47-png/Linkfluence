import { createHash } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { localMediaStorage } from './local-storage.adapter.js';
import { detectMedia } from './media.magic.js';
import { toMediaAsset } from './media.mapper.js';
import { mediaRepository } from './media.repository.js';

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
      && !(file.mimetype === 'video/quicktime' && detected.kind === 'VIDEO')) {
      throw new AppError('The file extension and content type do not match.', 400, 'MEDIA_TYPE_MISMATCH');
    }
    const maxBytes = detected.kind === 'IMAGE'
      ? env.mediaMaxImageBytes
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
    return asset;
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
};
