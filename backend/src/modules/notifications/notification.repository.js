import { prisma } from '../../config/database.js';
export const notificationRepository = {
  async list(userId, { unread, page, limit }) {
    const where = { userId, ...(unread !== undefined && { readAt: unread ? null : { not: null } }) };
    const [items, total, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { items, total, unreadCount };
  },
  read(userId, id) {
    return prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
  },
  readAll(userId) {
    return prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  },
  preference(userId) {
    return prisma.notificationPreference.findUnique({ where: { userId } });
  },
  savePreference(userId, data) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  },
};
