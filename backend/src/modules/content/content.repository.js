import { prisma } from '../../config/database.js';

const includePost = {
  creator: { select: { id: true, userId: true, slug: true, channelName: true, avatarUrl: true, coverUrl: true, verificationStatus: true } },
  business: { select: { id: true, userId: true, slug: true, companyName: true, logoUrl: true, coverUrl: true, verificationStatus: true } },
  media: {
    orderBy: { sortOrder: 'asc' },
    include: {
      mediaAsset: { select: { id: true, url: true, mimeType: true, deletedAt: true } },
      thumbnail: { select: { id: true, url: true, mimeType: true, deletedAt: true } },
    },
  },
  campaign: { select: { id: true, slug: true, title: true } },
  audioAsset: { select: { id: true, url: true, mimeType: true, deletedAt: true } },
  _count: { select: { reactions: { where: { type: 'LIKE' } } } },
};

const authorWhere = (authorType, authorIds) => authorType === 'CREATOR'
  ? { creatorId: { in: authorIds } }
  : { businessId: { in: authorIds } };

const activeContentWhere = () => ({
  OR: [
    { expiresAt: null },
    { expiresAt: { gt: new Date() } },
  ],
});

export const contentRepository = {
  findAuthor(userId, authorType, db = prisma) {
    return authorType === 'CREATOR'
      ? db.creatorProfile.findFirst({ where: { userId, user: { status: 'ACTIVE', deletedAt: null } }, select: { id: true, userId: true } })
      : db.businessProfile.findFirst({ where: { userId, user: { status: 'ACTIVE', deletedAt: null } }, select: { id: true, userId: true } });
  },

  async followed(userId, db = prisma) {
    if (!userId) return [];
    return db.follow.findMany({ where: { followerId: userId, targetType: { in: ['CREATOR', 'BUSINESS'] } }, select: { targetType: true, targetId: true } });
  },

  async hidden(userId, db = prisma) {
    if (!userId) return [];
    const [blocks, mutes] = await db.$transaction([
      db.userBlock.findMany({ where: { blockerId: userId }, select: { targetType: true, targetId: true } }),
      db.channelMute.findMany({ where: { userId }, select: { targetType: true, targetId: true } }),
    ]);
    return [...blocks, ...mutes];
  },

  async list(filters, userId, db = prisma) {
    const [allFollowed, hidden] = await Promise.all([this.followed(userId, db), this.hidden(userId, db)]);
    const hiddenKeys = new Set(hidden.map((item) => `${item.targetType}:${item.targetId}`));
    const followed = allFollowed.filter((item) => !hiddenKeys.has(`${item.targetType}:${item.targetId}`));
    const creatorIds = followed.filter((item) => item.targetType === 'CREATOR').map((item) => item.targetId);
    const businessIds = followed.filter((item) => item.targetType === 'BUSINESS').map((item) => item.targetId);
    const followedOr = [
      ...(creatorIds.length ? [{ creatorId: { in: creatorIds } }] : []),
      ...(businessIds.length ? [{ businessId: { in: businessIds } }] : []),
    ];
    if (filters.mode === 'following' && !followedOr.length) {
      return { items: [], nextCursor: null, followed };
    }
    const visibility = filters.mode === 'following'
      ? { OR: followedOr }
      : {
          OR: [
            { visibility: 'PUBLIC' },
            ...(followedOr.length ? [{ visibility: 'FOLLOWERS', OR: followedOr }] : []),
          ],
        };
    const hiddenOr = hidden.map((item) => item.targetType === 'CREATOR'
      ? { creatorId: item.targetId }
      : { businessId: item.targetId });
    const where = {
      status: 'PUBLISHED',
      deletedAt: null,
      AND: [
        visibility,
        activeContentWhere(),
        ...(hiddenOr.length ? [{ NOT: { OR: hiddenOr } }] : []),
        ...(filters.q ? [{ OR: [
          { title: { contains: filters.q, mode: 'insensitive' } },
          { caption: { contains: filters.q, mode: 'insensitive' } },
          { creator: { channelName: { contains: filters.q, mode: 'insensitive' } } },
          { creator: { bio: { contains: filters.q, mode: 'insensitive' } } },
          { creator: { location: { contains: filters.q, mode: 'insensitive' } } },
          { business: { companyName: { contains: filters.q, mode: 'insensitive' } } },
          { business: { description: { contains: filters.q, mode: 'insensitive' } } },
          { business: { location: { contains: filters.q, mode: 'insensitive' } } },
          { category: { contains: filters.q, mode: 'insensitive' } },
        ] }] : []),
        ...(filters.section === 'featured' ? [{ OR: [
          { paidPartnership: true },
          { creator: { verificationStatus: 'VERIFIED' } },
          { business: { verificationStatus: 'VERIFIED' } },
        ] }] : []),
      ],
      ...(filters.category && { category: { equals: filters.category, mode: 'insensitive' } }),
      ...(filters.authorType && { authorType: filters.authorType }),
      ...(filters.hideCampaigns
        ? { postType: { not: 'CAMPAIGN' } }
        : filters.postType && { postType: filters.postType }),
      ...(filters.mediaType && { media: { some: { mediaType: filters.mediaType } } }),
    };
    const rankedOrder = ['trending', 'recommended', 'featured'].includes(filters.section)
      ? [{ reactions: { _count: 'desc' } }, { publishedAt: 'desc' }, { id: 'desc' }]
      : [{ publishedAt: 'desc' }, { id: 'desc' }];
    const rows = await db.contentPost.findMany({
      where,
      include: includePost,
      orderBy: rankedOrder,
      take: filters.limit + 1,
      ...(filters.cursor && { cursor: { id: filters.cursor }, skip: 1 }),
    });
    return { items: rows.slice(0, filters.limit), nextCursor: rows.length > filters.limit ? rows[filters.limit - 1].id : null, followed };
  },

  async viewerState(userId, postIds, followed = [], db = prisma) {
    if (!userId || !postIds.length) return { likedIds: new Set(), savedIds: new Set(), followingKeys: new Set() };
    const [liked, saved] = await db.$transaction([
      db.contentReaction.findMany({ where: { userId, postId: { in: postIds }, type: 'LIKE' }, select: { postId: true } }),
      db.savedItem.findMany({ where: { userId, targetType: 'CONTENT', targetId: { in: postIds } }, select: { targetId: true } }),
    ]);
    return {
      likedIds: new Set(liked.map((item) => item.postId)),
      savedIds: new Set(saved.map((item) => item.targetId)),
      followingKeys: new Set(followed.map((item) => `${item.targetType.toLowerCase()}:${item.targetId}`)),
    };
  },

  findById(id, db = prisma) {
    return db.contentPost.findUnique({ where: { id }, include: includePost });
  },

  async isHidden(userId, post, db = prisma) {
    if (!userId) return false;
    const targetType = post.authorType;
    const targetId = targetType === 'CREATOR' ? post.creatorId : post.businessId;
    const [blocked, muted] = await db.$transaction([
      db.userBlock.findUnique({ where: { blockerId_targetType_targetId: { blockerId: userId, targetType, targetId } }, select: { id: true } }),
      db.channelMute.findUnique({ where: { userId_targetType_targetId: { userId, targetType, targetId } }, select: { id: true } }),
    ]);
    return Boolean(blocked || muted);
  },

  isChannelHidden(userId, authorType, authorId, db = prisma) {
    if (!userId) return false;
    return db.userBlock.findUnique({ where: { blockerId_targetType_targetId: { blockerId: userId, targetType: authorType, targetId: authorId } }, select: { id: true } });
  },

  async listChannel(authorType, authorId, filters, db = prisma) {
    const rows = await db.contentPost.findMany({
      where: { ...authorWhere(authorType, [authorId]), status: 'PUBLISHED', visibility: 'PUBLIC', deletedAt: null, AND: [activeContentWhere()] },
      include: includePost,
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: filters.limit + 1,
      ...(filters.cursor && { cursor: { id: filters.cursor }, skip: 1 }),
    });
    return { items: rows.slice(0, filters.limit), nextCursor: rows.length > filters.limit ? rows[filters.limit - 1].id : null };
  },

  async listMine(userId, filters, db = prisma) {
    const where = {
      authorType: filters.authorType,
      ...(filters.authorType === 'CREATOR' ? { creator: { userId } } : { business: { userId } }),
      deletedAt: null,
      ...(filters.status && { status: filters.status }),
      ...(filters.postType && { postType: filters.postType }),
    };
    const rows = await db.contentPost.findMany({
      where, include: includePost, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: filters.limit + 1,
      ...(filters.cursor && { cursor: { id: filters.cursor }, skip: 1 }),
    });
    return { items: rows.slice(0, filters.limit), nextCursor: rows.length > filters.limit ? rows[filters.limit - 1].id : null };
  },

  findOwned(id, userId, db = prisma) {
    return db.contentPost.findFirst({
      where: { id, deletedAt: null, OR: [{ creator: { userId } }, { business: { userId } }] },
      include: includePost,
    });
  },

  findMediaAssets(userId, ids, db = prisma) {
    return db.mediaAsset.findMany({ where: { id: { in: ids }, ownerId: userId, purpose: 'CONTENT', deletedAt: null }, select: { id: true, mimeType: true } });
  },

  findMediaAsset(userId, id, db = prisma) {
    return db.mediaAsset.findFirst({ where: { id, ownerId: userId, purpose: 'CONTENT', deletedAt: null }, select: { id: true, mimeType: true } });
  },

  findCampaign(id, db = prisma) {
    return db.campaign.findUnique({ where: { id }, select: { id: true, businessId: true, status: true } });
  },
  findPortfolio(id, db = prisma) {
    return db.portfolioItem.findFirst({ where: { id, deletedAt: null }, select: { id: true, creatorId: true, status: true } });
  },
  findCollaboration(id, db = prisma) {
    return db.collaboration.findUnique({
      where: { id },
      select: { id: true, creatorId: true, businessId: true, status: true, contract: { select: { disclosureRequired: true } } },
    });
  },
  findCreator(id, db = prisma) {
    return db.creatorProfile.findFirst({ where: { id, user: { status: 'ACTIVE', deletedAt: null } }, select: { id: true } });
  },
  findBusiness(id, db = prisma) {
    return db.businessProfile.findFirst({ where: { id, user: { status: 'ACTIVE', deletedAt: null } }, select: { id: true } });
  },

  async create(data, media, db = prisma) {
    return db.$transaction(async (tx) => tx.contentPost.create({
      data: { ...data, media: { create: media } }, include: includePost,
    }));
  },

  async update(id, data, media, db = prisma) {
    return db.$transaction(async (tx) => {
      if (media) await tx.contentMedia.deleteMany({ where: { postId: id } });
      return tx.contentPost.update({
        where: { id },
        data: { ...data, ...(media && { media: { create: media } }) },
        include: includePost,
      });
    });
  },

  like(userId, postId, db = prisma) {
    return db.contentReaction.upsert({ where: { userId_postId_type: { userId, postId, type: 'LIKE' } }, create: { userId, postId, type: 'LIKE' }, update: {} });
  },
  unlike(userId, postId, db = prisma) {
    return db.contentReaction.deleteMany({ where: { userId, postId, type: 'LIKE' } });
  },
  createLikeNotification(post, actor, db = prisma) {
    const ownerUserId = post.creator?.userId || post.business?.userId;
    if (!ownerUserId || !actor || ownerUserId === actor.id) return null;
    return db.notification.upsert({
      where: { userId_sourceEventId: { userId: ownerUserId, sourceEventId: `content-like:${actor.id}:${post.id}` } },
      create: {
        userId: ownerUserId, sourceEventId: `content-like:${actor.id}:${post.id}`, type: 'CONTENT_LIKE',
        title: 'Your post received a like', body: `${actor.displayName} liked your post.`, href: `/posts/${post.id}`,
        data: { postId: post.id, actorId: actor.id },
      }, update: {},
    });
  },
  findUser(id, db = prisma) {
    return db.user.findUnique({ where: { id }, select: { id: true, displayName: true } });
  },
};
