import { prisma } from '../../config/database.js';
import { payerTrustSelect } from '../payments/payer-trust.js';

const creatorInclude = {
  socialAccounts: {
    include: { stats: { orderBy: { capturedAt: 'desc' }, take: 1 } },
    orderBy: { followerCount: 'desc' },
  },
  portfolioItems: {
    where: { status: 'PUBLISHED', deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
  },
  user: { select: { avatarUrl: true } },
};

const businessListInclude = {
  socialAccounts: {
    include: { stats: { orderBy: { capturedAt: 'desc' }, take: 1 } },
    orderBy: { followerCount: 'desc' },
  },
  _count: {
    select: {
      campaigns: { where: { status: 'OPEN', isPublic: true } },
      collaborations: { where: { status: 'COMPLETED' } },
    },
  },
  collaborations: { select: payerTrustSelect },
};

function activeCreatorWhere(filters) {
  const social = {};
  if (filters.platform) social.platform = filters.platform;
  if (filters.minEngagement !== undefined || filters.maxEngagement !== undefined) {
    social.engagementRate = {
      ...(filters.minEngagement !== undefined && { gte: filters.minEngagement }),
      ...(filters.maxEngagement !== undefined && { lte: filters.maxEngagement }),
    };
  }
  return {
    user: { status: 'ACTIVE', deletedAt: null },
    ...(filters.q && {
      OR: [
        { channelName: { contains: filters.q, mode: 'insensitive' } },
        { slug: { contains: filters.q, mode: 'insensitive' } },
        { bio: { contains: filters.q, mode: 'insensitive' } },
        { location: { contains: filters.q, mode: 'insensitive' } },
        { categories: { has: filters.q } },
        { skills: { has: filters.q } },
      ],
    }),
    ...(filters.category && { categories: { has: filters.category } }),
    ...(filters.location && { location: { contains: filters.location, mode: 'insensitive' } }),
    ...(filters.language && { languages: { has: filters.language } }),
    ...(filters.skills?.length && { skills: { hasEvery: filters.skills } }),
    ...(filters.currency && { currency: filters.currency }),
    ...(filters.verified !== undefined && {
      verificationStatus: filters.verified ? 'VERIFIED' : { not: 'VERIFIED' },
    }),
    ...(filters.available !== undefined && { availableForWork: filters.available }),
    ...(filters.minRating !== undefined && { ratingAverage: { gte: filters.minRating } }),
    ...((filters.minPrice !== undefined || filters.maxPrice !== undefined) && {
      startingRate: {
        ...(filters.minPrice !== undefined && { gte: filters.minPrice }),
        ...(filters.maxPrice !== undefined && { lte: filters.maxPrice }),
      },
    }),
    ...(Object.keys(social).length && { socialAccounts: { some: social } }),
  };
}

function activeBusinessWhere(filters) {
  return {
    user: { status: 'ACTIVE', deletedAt: null },
    ...(filters.q && {
      OR: [
        { companyName: { contains: filters.q, mode: 'insensitive' } },
        { slug: { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
        { industry: { contains: filters.q, mode: 'insensitive' } },
        { location: { contains: filters.q, mode: 'insensitive' } },
      ],
    }),
    ...(filters.industry && { industry: { contains: filters.industry, mode: 'insensitive' } }),
    ...(filters.location && { location: { contains: filters.location, mode: 'insensitive' } }),
    ...(filters.minRating !== undefined && { ratingAverage: { gte: filters.minRating } }),
    ...(filters.verified !== undefined && {
      verificationStatus: filters.verified ? 'VERIFIED' : { not: 'VERIFIED' },
    }),
  };
}

const number = (value, fallback = 0) => value == null ? fallback : Number(value);
const totalFollowers = (profile) => profile.socialAccounts.reduce((sum, account) => sum + account.followerCount, 0);
const averageEngagement = (profile) => {
  const values = profile.socialAccounts.map((account) => number(account.engagementRate, null)).filter((value) => value !== null);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
};
const newestTie = (left, right) => right.createdAt.getTime() - left.createdAt.getTime() || left.id.localeCompare(right.id);
const nullLast = (left, right, direction = 1) => {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return (Number(left) - Number(right)) * direction;
};

function compareCreators(sort) {
  return (left, right) => {
    if (sort === 'alphabetical') return left.channelName.localeCompare(right.channelName) || left.id.localeCompare(right.id);
    if (sort === 'newest') return newestTie(left, right);
    if (['rating', 'highest_rated'].includes(sort)) return nullLast(left.ratingAverage, right.ratingAverage, -1) || newestTie(left, right);
    if (sort === 'price_low') return nullLast(left.startingRate, right.startingRate, 1) || newestTie(left, right);
    if (sort === 'price_high') return nullLast(left.startingRate, right.startingRate, -1) || newestTie(left, right);
    if (['followers', 'most_followed'].includes(sort)) return totalFollowers(right) - totalFollowers(left) || newestTie(left, right);
    const leftScore = Math.log10(totalFollowers(left) + 1) * 30 + averageEngagement(left) * 8 + number(left.ratingAverage) * 12;
    const rightScore = Math.log10(totalFollowers(right) + 1) * 30 + averageEngagement(right) * 8 + number(right.ratingAverage) * 12;
    return rightScore - leftScore || newestTie(left, right);
  };
}

function compareBusinesses(sort) {
  return (left, right) => {
    if (['name', 'alphabetical'].includes(sort)) return left.companyName.localeCompare(right.companyName) || left.id.localeCompare(right.id);
    if (sort === 'newest') return newestTie(left, right);
    if (['rating', 'highest_rated'].includes(sort)) return nullLast(left.ratingAverage, right.ratingAverage, -1) || newestTie(left, right);
    const leftScore = left._count.collaborations * 40 + left._count.campaigns * 10 + number(left.ratingAverage) * 12;
    const rightScore = right._count.collaborations * 40 + right._count.campaigns * 10 + number(right.ratingAverage) * 12;
    return rightScore - leftScore || newestTie(left, right);
  };
}

function pageWindow(items, filters) {
  const cursorIndex = filters.cursorId ? items.findIndex((item) => item.id === filters.cursorId) : -1;
  if (filters.cursorId && cursorIndex < 0) return { selected: [], cursorFound: false, hasMore: false };
  const start = filters.cursorId ? cursorIndex + 1 : (filters.page - 1) * filters.limit;
  const selected = items.slice(start, start + filters.limit);
  return { selected, cursorFound: true, hasMore: start + selected.length < items.length };
}

export const marketplaceRepository = {
  async listCreators(filters) {
    const where = activeCreatorWhere(filters);
    const candidates = await prisma.creatorProfile.findMany({
      where,
      select: {
        id: true,
        channelName: true,
        createdAt: true,
        ratingAverage: true,
        startingRate: true,
        socialAccounts: { select: { followerCount: true, engagementRate: true } },
      },
    });
    const ranked = candidates
      .filter((item) => filters.minFollowers === undefined || totalFollowers(item) >= filters.minFollowers)
      .filter((item) => filters.maxFollowers === undefined || totalFollowers(item) <= filters.maxFollowers)
      .sort(compareCreators(filters.sort));
    const window = pageWindow(ranked, filters);
    if (!window.selected.length) return { items: [], total: ranked.length, ...window };
    const rows = await prisma.creatorProfile.findMany({
      where: { id: { in: window.selected.map((item) => item.id) } },
      include: creatorInclude,
    });
    const byId = new Map(rows.map((item) => [item.id, item]));
    return { items: window.selected.map((item) => byId.get(item.id)).filter(Boolean), total: ranked.length, ...window };
  },

  findCreator(identifier) {
    return prisma.creatorProfile.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier.replace(/^@/, '').toLowerCase() }],
        user: { status: 'ACTIVE', deletedAt: null },
      },
      include: creatorInclude,
    });
  },

  async listBusinesses(filters) {
    const where = activeBusinessWhere(filters);
    const candidates = await prisma.businessProfile.findMany({
      where,
      select: {
        id: true,
        companyName: true,
        createdAt: true,
        ratingAverage: true,
        _count: businessListInclude._count,
      },
    });
    const ranked = candidates
      .filter((item) => filters.minCompletedCollaborations === undefined
        || item._count.collaborations >= filters.minCompletedCollaborations)
      .sort(compareBusinesses(filters.sort));
    const window = pageWindow(ranked, filters);
    if (!window.selected.length) return { items: [], total: ranked.length, ...window };
    const rows = await prisma.businessProfile.findMany({
      where: { id: { in: window.selected.map((item) => item.id) } },
      include: businessListInclude,
    });
    const byId = new Map(rows.map((item) => [item.id, item]));
    return { items: window.selected.map((item) => byId.get(item.id)).filter(Boolean), total: ranked.length, ...window };
  },

  findBusiness(identifier) {
    return prisma.businessProfile.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier.replace(/^@/, '').toLowerCase() }],
        user: { status: 'ACTIVE', deletedAt: null },
      },
      include: {
        ...businessListInclude,
        campaigns: {
          where: { status: 'OPEN', isPublic: true },
          orderBy: { publishedAt: 'desc' },
          take: 6,
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            category: true,
            goal: true,
            platforms: true,
            budgetMin: true,
            budgetMax: true,
            currency: true,
            applicationDeadline: true,
            deadline: true,
            deliverables: true,
            status: true,
            isPublic: true,
            publishedAt: true,
            _count: { select: { proposals: true } },
          },
        },
      },
    });
  },

  categorySource() {
    return prisma.creatorProfile.findMany({
      where: { user: { status: 'ACTIVE', deletedAt: null } },
      select: { categories: true },
    });
  },

  recentTargets(userId, limit, db = prisma) {
    if (!userId) return [];
    return db.recentView.findMany({
      where: { userId },
      orderBy: [{ viewedAt: 'desc' }, { id: 'desc' }],
      take: limit,
      select: { targetType: true, targetId: true, viewedAt: true },
    });
  },
};
