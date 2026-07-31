import { campaignService } from '../campaigns/public.js';
import { marketplaceService } from '../marketplace/public.js';
import { showcaseService } from '../showcase/public.js';

const creatorFilters = (query, overrides = {}) => ({
  q: query.q || undefined,
  category: query.category,
  location: query.location,
  sort: query.sort === 'rating' ? 'rating' : query.sort === 'newest' ? 'newest' : 'relevant',
  page: query.page || 1,
  limit: query.limit || 12,
  ...overrides,
});
const businessFilters = (query, overrides = {}) => ({
  q: query.q || undefined,
  location: query.location,
  sort: query.sort === 'rating' ? 'rating' : query.sort === 'newest' ? 'newest' : 'relevant',
  page: query.page || 1,
  limit: query.limit || 12,
  ...overrides,
});
const campaignFilters = (query, overrides = {}) => ({
  q: query.q || undefined,
  category: query.category,
  sort: query.sort === 'newest' ? 'newest' : 'newest',
  page: query.page || 1,
  limit: query.limit || 12,
  ...overrides,
});

export const discoveryService = {
  async discover(limit) {
    const [creators, businesses, campaigns, showcase, categories] = await Promise.all([
      marketplaceService.listCreators(creatorFilters({}, { sort: 'rating', page: 1, limit })),
      marketplaceService.listBusinesses(businessFilters({}, { sort: 'rating', page: 1, limit })),
      campaignService.listPublic(campaignFilters({}, { page: 1, limit })),
      showcaseService.list({ limit }),
      marketplaceService.categories(),
    ]);
    return {
      creators: creators.items,
      businesses: businesses.items,
      campaigns: campaigns.items,
      showcase: showcase.items,
      categories,
      generatedAt: new Date(),
    };
  },

  async search(query) {
    const tasks = {};
    if (query.type === 'all' || query.type === 'creators') {
      tasks.creators = marketplaceService.listCreators(creatorFilters(query));
    }
    if (query.type === 'all' || query.type === 'businesses') {
      tasks.businesses = marketplaceService.listBusinesses(businessFilters(query));
    }
    if (query.type === 'all' || query.type === 'campaigns') {
      tasks.campaigns = campaignService.listPublic(campaignFilters(query));
    }
    if (query.type === 'all' || query.type === 'showcase') {
      tasks.showcase = showcaseService.list({
        q: query.q || undefined,
        category: query.category,
        limit: query.limit,
      });
    }
    const entries = await Promise.all(
      Object.entries(tasks).map(async ([key, promise]) => [key, await promise]),
    );
    return Object.fromEntries(entries);
  },
};
