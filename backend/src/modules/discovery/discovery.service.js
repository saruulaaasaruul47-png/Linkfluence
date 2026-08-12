import { campaignService } from '../campaigns/public.js';
import { contentService } from '../content/public.js';
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
  async discover(limit, viewer = null) {
    const roles = viewer?.roles || [];
    const canBrowseCampaigns = roles.includes('CREATOR');
    const [creators, businesses, campaigns, showcase, categories, showcaseCount, popularCreators, popularBusinesses, featuredContent, trendingContent, latestContent, recommendedContent, followingContent, recentlyViewed] = await Promise.all([
      marketplaceService.listCreators(creatorFilters({}, { sort: 'newest', page: 1, limit })),
      marketplaceService.listBusinesses(businessFilters({}, { sort: 'newest', page: 1, limit })),
      canBrowseCampaigns
        ? campaignService.listPublic(campaignFilters({}, { page: 1, limit }))
        : Promise.resolve({ items: [], pagination: null }),
      showcaseService.list({ limit }),
      marketplaceService.categories(),
      showcaseService.countPublic(),
      marketplaceService.listCreators(creatorFilters({}, { sort: 'most_followed', page: 1, limit })),
      marketplaceService.listBusinesses(businessFilters({}, { sort: 'trending', page: 1, limit })),
      contentService.feed({ mode: 'for_you', section: 'featured', limit }, viewer),
      contentService.feed({ mode: 'for_you', section: 'trending', limit }, viewer),
      contentService.feed({ mode: 'for_you', section: 'latest', limit }, viewer),
      contentService.feed({ mode: 'for_you', section: 'recommended', limit }, viewer),
      viewer?.id
        ? contentService.feed({ mode: 'following', section: 'following', limit }, viewer)
        : Promise.resolve({ items: [], nextCursor: null, section: 'following' }),
      marketplaceService.recentlyViewed(viewer?.id, limit),
    ]);
    const activeCategories = categories.filter((category) => category.creatorCount > 0);
    return {
      creators: creators.items,
      businesses: businesses.items,
      campaigns: campaigns.items,
      showcase: showcase.items,
      categories,
      sections: {
        featured: { creators: creators.items, businesses: businesses.items, content: featuredContent.items },
        trending: { creators: popularCreators.items, businesses: popularBusinesses.items, content: trendingContent.items },
        latest: { content: latestContent.items },
        recommended: { content: recommendedContent.items },
        following: { content: followingContent.items, empty: followingContent.items.length === 0 },
        popular: { creators: popularCreators.items, businesses: popularBusinesses.items },
        recentlyViewed,
      },
      stats: {
        creatorCount: creators.pagination.total,
        businessCount: businesses.pagination.total,
        showcaseCount,
        activeCategoryCount: activeCategories.length,
        featuredAudience: creators.items.reduce((total, creator) => total + creator.followerCount, 0),
      },
      generatedAt: new Date(),
    };
  },

  async search(query, roles = []) {
    const canBrowseCampaigns = roles?.includes('CREATOR');
    const tasks = {};
    if (query.type === 'all' || query.type === 'creators') {
      tasks.creators = marketplaceService.listCreators(creatorFilters(query));
    }
    if (query.type === 'all' || query.type === 'businesses') {
      tasks.businesses = marketplaceService.listBusinesses(businessFilters(query));
    }
    if (canBrowseCampaigns && (query.type === 'all' || query.type === 'campaigns')) {
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
