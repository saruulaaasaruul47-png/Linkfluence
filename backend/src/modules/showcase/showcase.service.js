import { AppError } from '../../shared/errors/AppError.js';
import { toShowcase } from './showcase.mapper.js';
import { showcaseRepository } from './showcase.repository.js';

const missing = () => new AppError('Showcase post was not found.', 404, 'SHOWCASE_NOT_FOUND');

export const showcaseService = {
  countPublic() {
    return showcaseRepository.countPublic();
  },

  async list(filters, followerId = null) {
    const result = await showcaseRepository.list(filters, followerId);
    return {
      items: result.items.map((item) => toShowcase(item)),
      nextCursor: result.nextCursor,
    };
  },

  async get(id, userId = null) {
    const post = await showcaseRepository.findPublic(id);
    if (!post) throw missing();
    const liked = userId ? Boolean(await showcaseRepository.isLiked(userId, id)) : false;
    return toShowcase(post, liked);
  },

  async mine(userId) {
    return (await showcaseRepository.listOwned(userId)).map((item) => toShowcase(item));
  },

  async create(userId, payload) {
    const portfolio = await showcaseRepository.findOwnedPortfolio(payload.portfolioItemId, userId);
    if (!portfolio) {
      throw new AppError('Choose one of your portfolio items.', 404, 'PORTFOLIO_ITEM_NOT_FOUND');
    }
    if (await showcaseRepository.findByPortfolio(payload.portfolioItemId, userId)) {
      throw new AppError('This portfolio item is already in the showcase.', 409, 'SHOWCASE_ALREADY_EXISTS');
    }
    const publishing = payload.status === 'PUBLISHED';
    if (publishing && portfolio.status !== 'PUBLISHED') {
      throw new AppError('Publish the portfolio item before adding it to the public showcase.', 409, 'PORTFOLIO_NOT_PUBLISHED');
    }
    return toShowcase(await showcaseRepository.create({
      creatorId: portfolio.creator.id,
      portfolioItemId: portfolio.id,
      title: payload.title || portfolio.title,
      description: payload.description ?? portfolio.description,
      category: payload.category ?? portfolio.category,
      mediaType: portfolio.mediaType,
      mediaUrl: portfolio.mediaUrl,
      thumbnailUrl: portfolio.thumbnailUrl,
      status: payload.status,
      publishedAt: publishing ? new Date() : null,
    }));
  },

  async update(userId, id, payload) {
    const post = await showcaseRepository.findOwned(id, userId);
    if (!post) throw missing();
    const data = { ...payload };
    if (payload.status === 'PUBLISHED' && post.status !== 'PUBLISHED') {
      data.publishedAt = new Date();
      data.archivedAt = null;
    }
    if (payload.status === 'ARCHIVED') data.archivedAt = new Date();
    if (payload.status === 'DRAFT') {
      data.publishedAt = null;
      data.archivedAt = null;
    }
    return toShowcase(await showcaseRepository.update(id, data));
  },

  async remove(userId, id) {
    const post = await showcaseRepository.findOwned(id, userId);
    if (!post) throw missing();
    await showcaseRepository.update(id, { status: 'ARCHIVED', archivedAt: new Date() });
    return null;
  },

  async like(userId, id) {
    if (!await showcaseRepository.findPublic(id)) throw missing();
    await showcaseRepository.like(userId, id);
    return this.get(id, userId);
  },

  async unlike(userId, id) {
    if (!await showcaseRepository.findPublic(id)) throw missing();
    await showcaseRepository.unlike(userId, id);
    return this.get(id, userId);
  },
};
