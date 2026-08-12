import { MARKETPLACE_CATEGORIES } from '../../shared/constants/category.constants.js';
import { AppError } from '../../shared/errors/AppError.js';
import { toPublicBusiness, toPublicCreator } from './marketplace.mapper.js';
import { marketplaceRepository } from './marketplace.repository.js';
import { getSetting } from '../operations/platform-config.service.js';

const pagination = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPreviousPage: page > 1,
});

const encodeCursor = (scope, sort, id) => Buffer
  .from(JSON.stringify({ version: 1, scope, sort, id }), 'utf8')
  .toString('base64url');

function decodeCursor(value, scope, sort) {
  if (!value) return null;
  try {
    const payload = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (payload.version !== 1 || payload.scope !== scope || payload.sort !== sort || typeof payload.id !== 'string') throw new Error();
    return payload.id;
  } catch {
    throw new AppError('The pagination cursor is invalid or belongs to another result order.', 400, 'INVALID_CURSOR');
  }
}

function assertRanges(filters) {
  const ranges = [
    ['minPrice', 'maxPrice', 'Minimum price cannot exceed maximum price.'],
    ['minFollowers', 'maxFollowers', 'Minimum followers cannot exceed maximum followers.'],
    ['minEngagement', 'maxEngagement', 'Minimum engagement cannot exceed maximum engagement.'],
  ];
  for (const [minimum, maximum, message] of ranges) {
    if (filters[minimum] !== undefined && filters[maximum] !== undefined && filters[minimum] > filters[maximum]) {
      throw new AppError(message, 400, 'INVALID_FILTER_RANGE');
    }
  }
}

export const marketplaceService = {
  async listCreators(filters) {
    assertRanges(filters);
    const normalized = { ...filters, cursorId: decodeCursor(filters.cursor, 'creators', filters.sort) };
    const result = await marketplaceRepository.listCreators(normalized);
    if (!result.cursorFound) throw new AppError('The pagination cursor no longer exists in this result set.', 400, 'INVALID_CURSOR');
    const last = result.items.at(-1);
    const pageInfo = pagination(filters.page, filters.limit, result.total);
    const publicPricing = await getSetting('publicPricing');
    return {
      items: result.items.map(toPublicCreator).map((item) => publicPricing ? item : { ...item, publicRates: false, startingRate: null, rates: null }),
      pagination: { ...pageInfo, hasNextPage: result.hasMore, hasPreviousPage: Boolean(filters.cursor) || pageInfo.hasPreviousPage },
      nextCursor: result.hasMore && last ? encodeCursor('creators', filters.sort, last.id) : null,
    };
  },

  async getCreator(identifier) {
    const creator = await marketplaceRepository.findCreator(identifier);
    if (!creator) throw new AppError('Creator profile was not found.', 404, 'CREATOR_NOT_FOUND');
    const mapped = toPublicCreator(creator);
    return await getSetting('publicPricing') ? mapped : { ...mapped, publicRates: false, startingRate: null, rates: null };
  },

  async listBusinesses(filters) {
    const normalized = { ...filters, cursorId: decodeCursor(filters.cursor, 'businesses', filters.sort) };
    const result = await marketplaceRepository.listBusinesses(normalized);
    if (!result.cursorFound) throw new AppError('The pagination cursor no longer exists in this result set.', 400, 'INVALID_CURSOR');
    const last = result.items.at(-1);
    const pageInfo = pagination(filters.page, filters.limit, result.total);
    return {
      items: result.items.map(toPublicBusiness),
      pagination: { ...pageInfo, hasNextPage: result.hasMore, hasPreviousPage: Boolean(filters.cursor) || pageInfo.hasPreviousPage },
      nextCursor: result.hasMore && last ? encodeCursor('businesses', filters.sort, last.id) : null,
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

  async recentlyViewed(userId, limit = 8) {
    const rows = await marketplaceRepository.recentTargets(userId, limit);
    return rows.map((item) => ({
      key: `${item.targetType.toLowerCase()}:${item.targetId}`,
      targetType: item.targetType,
      targetId: item.targetId,
      viewedAt: item.viewedAt,
    }));
  },
};
