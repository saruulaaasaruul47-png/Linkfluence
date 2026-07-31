import { AppError } from '../../shared/errors/AppError.js';
import { mediaService } from '../media/public.js';
import { toPortfolio } from './portfolio.mapper.js';
import { portfolioRepository } from './portfolio.repository.js';

async function requireCreator(userId) {
  const creator = await portfolioRepository.findCreator(userId);
  if (!creator) throw new AppError('Create a creator channel first.', 403, 'CREATOR_PROFILE_REQUIRED');
  return creator;
}

async function mediaFields(userId, mediaAssetId) {
  const media = await mediaService.requireOwned(userId, mediaAssetId, 'PORTFOLIO');
  return {
    mediaAssetId: media.id,
    mediaUrl: media.url,
    mediaType: media.mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE',
  };
}

export const portfolioService = {
  async listMine(userId) {
    const creator = await requireCreator(userId);
    return (await portfolioRepository.listOwned(creator.id)).map((item) => toPortfolio(item));
  },

  async create(userId, payload) {
    const creator = await requireCreator(userId);
    if (await portfolioRepository.countActive(creator.id) >= 50) {
      throw new AppError('A creator channel can contain up to 50 portfolio items.', 409, 'PORTFOLIO_LIMIT_REACHED');
    }
    const status = payload.status || 'PUBLISHED';
    const item = await portfolioRepository.create({
      creatorId: creator.id,
      title: payload.title,
      description: payload.description || null,
      category: payload.category || null,
      status,
      sortOrder: payload.sortOrder || 0,
      publishedAt: status === 'PUBLISHED' ? new Date() : null,
      ...await mediaFields(userId, payload.mediaAssetId),
    });
    return toPortfolio(item);
  },

  async update(userId, itemId, payload) {
    const creator = await requireCreator(userId);
    const current = await portfolioRepository.findOwned(itemId, creator.id);
    if (!current) throw new AppError('Portfolio item was not found.', 404, 'PORTFOLIO_NOT_FOUND');
    const data = {
      ...(payload.title !== undefined && { title: payload.title }),
      ...(payload.description !== undefined && { description: payload.description || null }),
      ...(payload.category !== undefined && { category: payload.category || null }),
      ...(payload.sortOrder !== undefined && { sortOrder: payload.sortOrder }),
    };
    if (payload.mediaAssetId) Object.assign(data, await mediaFields(userId, payload.mediaAssetId));
    if (payload.status !== undefined) {
      data.status = payload.status;
      data.publishedAt = payload.status === 'PUBLISHED'
        ? current.publishedAt || new Date()
        : null;
    }
    return toPortfolio(await portfolioRepository.update(itemId, data));
  },

  async remove(userId, itemId) {
    const creator = await requireCreator(userId);
    if (!await portfolioRepository.findOwned(itemId, creator.id)) {
      throw new AppError('Portfolio item was not found.', 404, 'PORTFOLIO_NOT_FOUND');
    }
    await portfolioRepository.softDelete(itemId);
    return null;
  },

  async getPublic(itemId) {
    const item = await portfolioRepository.findPublic(itemId);
    if (!item) throw new AppError('Portfolio item was not found.', 404, 'PORTFOLIO_NOT_FOUND');
    return toPortfolio(item, { publicView: true });
  },
};
