import { MARKETPLACE_CATEGORIES } from '../../shared/constants/category.constants.js';
import { AppError } from '../../shared/errors/AppError.js';
import { toPublicBusiness, toPublicCreator } from './marketplace.mapper.js';
import { marketplaceRepository } from './marketplace.repository.js';

const pagination = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPreviousPage: page > 1,
});

export const marketplaceService = {
  async listCreators(filters) {
    if (filters.minPrice !== undefined
      && filters.maxPrice !== undefined
      && filters.minPrice > filters.maxPrice) {
      throw new AppError('Minimum price cannot exceed maximum price.', 400, 'INVALID_PRICE_RANGE');
    }
    const result = await marketplaceRepository.listCreators(filters);
    return {
      items: result.items.map(toPublicCreator),
      pagination: pagination(filters.page, filters.limit, result.total),
    };
  },

  async getCreator(identifier) {
    const creator = await marketplaceRepository.findCreator(identifier);
    if (!creator) throw new AppError('Creator profile was not found.', 404, 'CREATOR_NOT_FOUND');
    return toPublicCreator(creator);
  },

  async listBusinesses(filters) {
    const result = await marketplaceRepository.listBusinesses(filters);
    return {
      items: result.items.map(toPublicBusiness),
      pagination: pagination(filters.page, filters.limit, result.total),
    };
  },

  async getBusiness(identifier) {
    const business = await marketplaceRepository.findBusiness(identifier);
    if (!business) throw new AppError('Business profile was not found.', 404, 'BUSINESS_NOT_FOUND');
    return toPublicBusiness(business);
  },

  async categories() {
    const profiles = await marketplaceRepository.categorySource();
    const counts = new Map(MARKETPLACE_CATEGORIES.map((category) => [category, 0]));
    for (const profile of profiles) {
      for (const category of profile.categories) {
        if (counts.has(category)) counts.set(category, counts.get(category) + 1);
      }
    }
    return MARKETPLACE_CATEGORIES.map((name) => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      creatorCount: counts.get(name),
    }));
  },
};
