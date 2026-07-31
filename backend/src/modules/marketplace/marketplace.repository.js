import { prisma } from '../../config/database.js';

const creatorInclude = {
  socialAccounts: { orderBy: { followerCount: 'desc' } },
  portfolioItems: {
    where: { status: 'PUBLISHED', deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
  },
  user: { select: { avatarUrl: true } },
};

const businessListInclude = {
  _count: {
    select: {
      campaigns: { where: { status: 'OPEN', isPublic: true } },
    },
  },
};

function activeCreatorWhere(filters) {
  const social = {};
  if (filters.platform) social.platform = filters.platform;
  if (filters.minFollowers !== undefined) social.followerCount = { gte: filters.minFollowers };
  if (filters.minEngagement !== undefined) social.engagementRate = { gte: filters.minEngagement };
  return {
    user: { status: 'ACTIVE', deletedAt: null },
    ...(filters.q && {
      OR: [
        { channelName: { contains: filters.q, mode: 'insensitive' } },
        { slug: { contains: filters.q, mode: 'insensitive' } },
        { bio: { contains: filters.q, mode: 'insensitive' } },
      ],
    }),
    ...(filters.category && { categories: { has: filters.category } }),
    ...(filters.location && { location: { contains: filters.location, mode: 'insensitive' } }),
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

function creatorOrderBy(sort) {
  const orders = {
    newest: [{ createdAt: 'desc' }, { id: 'asc' }],
    rating: [{ ratingAverage: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }, { id: 'asc' }],
    price_low: [{ startingRate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }, { id: 'asc' }],
    price_high: [{ startingRate: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }, { id: 'asc' }],
  };
  return orders[sort] || orders.newest;
}

function activeBusinessWhere(filters) {
  return {
    user: { status: 'ACTIVE', deletedAt: null },
    ...(filters.q && {
      OR: [
        { companyName: { contains: filters.q, mode: 'insensitive' } },
        { slug: { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
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

function businessOrderBy(sort) {
  const orders = {
    newest: { createdAt: 'desc' },
    rating: { ratingAverage: { sort: 'desc', nulls: 'last' } },
    name: { companyName: 'asc' },
  };
  return orders[sort] || { createdAt: 'desc' };
}

export const marketplaceRepository = {
  async listCreators(filters) {
    const where = activeCreatorWhere(filters);
    const skip = (filters.page - 1) * filters.limit;
    const [items, total] = await prisma.$transaction([
      prisma.creatorProfile.findMany({
        where,
        include: creatorInclude,
        orderBy: filters.sort === 'followers'
          ? { createdAt: 'desc' }
          : creatorOrderBy(filters.sort),
        skip,
        take: filters.limit,
      }),
      prisma.creatorProfile.count({ where }),
    ]);
    return { items, total };
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
    const skip = (filters.page - 1) * filters.limit;
    const [items, total] = await prisma.$transaction([
      prisma.businessProfile.findMany({
        where,
        include: businessListInclude,
        orderBy: businessOrderBy(filters.sort),
        skip,
        take: filters.limit,
      }),
      prisma.businessProfile.count({ where }),
    ]);
    return { items, total };
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
            category: true,
            budgetMin: true,
            budgetMax: true,
            currency: true,
            deadline: true,
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
};
