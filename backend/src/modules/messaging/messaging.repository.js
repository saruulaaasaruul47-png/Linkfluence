import { prisma } from '../../config/database.js';

const memberInclude = {
  members: { include: { user: { select: { id: true, displayName: true, avatarUrl: true } } } },
  collaboration: { select: { id: true, campaign: { select: { id: true, title: true } }, contract: { select: { id: true } } } },
};

export const messagingRepository = {
  transaction(callback) { return prisma.$transaction(callback); },
  actorChannels(userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { creatorProfile: { select: { id: true } }, businessProfile: { select: { id: true } } },
    });
  },
  recipientChannel(type, identifier) {
    const commonUser = { select: { id: true, displayName: true, avatarUrl: true } };
    if (type === 'CREATOR') {
      return prisma.creatorProfile.findFirst({
        where: { OR: [{ id: identifier }, { slug: identifier }] },
        select: { id: true, channelName: true, user: commonUser },
      });
    }
    return prisma.businessProfile.findFirst({
      where: { OR: [{ id: identifier }, { slug: identifier }] },
      select: { id: true, companyName: true, user: commonUser },
    });
  },
  findDirect(directKey, db = prisma) {
    return db.conversation.findUnique({ where: { directKey }, select: { id: true } });
  },
  findPendingRequest(senderId, recipientId, db = prisma) {
    return db.messageRequest.findFirst({
      where: { senderId, recipientId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: { sender: { select: { id: true, displayName: true, avatarUrl: true } }, recipient: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
  },
  request(id, db = prisma) {
    return db.messageRequest.findUnique({
      where: { id },
      include: { sender: { select: { id: true, displayName: true, avatarUrl: true } }, recipient: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
  },
  async requests(userId, { box, status, page, limit }) {
    const where = {
      ...(box === 'incoming' ? { recipientId: userId } : { senderId: userId }),
      ...(status && { status }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.messageRequest.findMany({
        where,
        include: { sender: { select: { id: true, displayName: true, avatarUrl: true } }, recipient: { select: { id: true, displayName: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
      }),
      prisma.messageRequest.count({ where }),
    ]);
    return { items, total };
  },
  findMembership(conversationId, userId, db = prisma) {
    return db.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      include: { conversation: { include: memberInclude } },
    });
  },
  findCollaboration(collaborationId, userId) {
    return prisma.collaboration.findFirst({
      where: { id: collaborationId, OR: [{ business: { userId } }, { creator: { userId } }] },
      select: {
        id: true, conversation: { select: { id: true } },
        business: { select: { userId: true } }, creator: { select: { userId: true } },
        campaign: { select: { title: true } },
      },
    });
  },
  async list(userId, { q, page, limit }) {
    const where = {
      members: { some: { userId } },
      ...(q && { OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { members: { some: { user: { displayName: { contains: q, mode: 'insensitive' } } } } },
        { messages: { some: { body: { contains: q, mode: 'insensitive' }, deletedAt: null } } },
      ] }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.conversation.findMany({
        where, include: {
          ...memberInclude,
          members: { include: { user: { select: { id: true, displayName: true, avatarUrl: true } } } },
          messages: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { updatedAt: 'desc' }, skip: (page - 1) * limit, take: limit,
      }),
      prisma.conversation.count({ where }),
    ]);
    return { items, total };
  },
  messages(conversationId, cursor, limit) {
    return prisma.message.findMany({
      where: { conversationId, deletedAt: null },
      include: { sender: { select: { id: true, displayName: true, avatarUrl: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      take: limit + 1,
    });
  },
};
