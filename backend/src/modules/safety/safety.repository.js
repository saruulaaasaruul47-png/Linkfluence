import { prisma } from '../../config/database.js';

export const safetyRepository = {
  state(userId, db = prisma) {
    return db.$transaction([
      db.userBlock.findMany({ where: { blockerId: userId }, orderBy: { createdAt: 'desc' }, select: { targetType: true, targetId: true, createdAt: true } }),
      db.channelMute.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { targetType: true, targetId: true, createdAt: true } }),
    ]);
  },
  block(userId, targetType, targetId, db = prisma) {
    return db.$transaction(async (tx) => {
      const item = await tx.userBlock.upsert({
        where: { blockerId_targetType_targetId: { blockerId: userId, targetType, targetId } },
        create: { blockerId: userId, targetType, targetId }, update: {},
      });
      await tx.follow.deleteMany({ where: { followerId: userId, targetType, targetId } });
      await tx.channelMute.deleteMany({ where: { userId, targetType, targetId } });
      return item;
    });
  },
  unblock(userId, targetType, targetId, db = prisma) {
    return db.userBlock.deleteMany({ where: { blockerId: userId, targetType, targetId } });
  },
  mute(userId, targetType, targetId, db = prisma) {
    return db.channelMute.upsert({ where: { userId_targetType_targetId: { userId, targetType, targetId } }, create: { userId, targetType, targetId }, update: {} });
  },
  unmute(userId, targetType, targetId, db = prisma) {
    return db.channelMute.deleteMany({ where: { userId, targetType, targetId } });
  },
  findOpenReport(reporterId, targetType, targetId, db = prisma) {
    return db.trustCase.findFirst({ where: { reporterId, kind: 'REPORT', targetType, targetId, status: { in: ['OPEN', 'UNDER_REVIEW', 'ESCALATED'] } }, select: { id: true, status: true } });
  },
  createReport(data, db = prisma) {
    return db.trustCase.create({ data, select: { id: true, targetType: true, targetId: true, reason: true, status: true, createdAt: true } });
  },
};
