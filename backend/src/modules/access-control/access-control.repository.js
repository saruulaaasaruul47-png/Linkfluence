import { prisma } from '../../config/database.js';

const grantInclude = {
  permission: { select: { id: true, key: true, description: true } },
  grantedBy: { select: { id: true, displayName: true, email: true } },
};

export const accessControlRepository = {
  listPermissions(db = prisma) {
    return db.permission.findMany({ orderBy: { key: 'asc' } });
  },
  findUser(userId, db = prisma) {
    return db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, displayName: true, status: true },
    });
  },
  findPermission(key, db = prisma) {
    return db.permission.findUnique({ where: { key } });
  },
  listUserPermissions(userId, db = prisma) {
    return db.userPermission.findMany({
      where: { userId },
      include: grantInclude,
      orderBy: { createdAt: 'asc' },
    });
  },
  grant({ userId, permissionId, grantedById }, db = prisma) {
    return db.userPermission.upsert({
      where: { userId_permissionId: { userId, permissionId } },
      create: { userId, permissionId, grantedById },
      update: { grantedById },
      include: grantInclude,
    });
  },
  revoke(userId, permissionId, db = prisma) {
    return db.userPermission.deleteMany({ where: { userId, permissionId } });
  },
  recordAudit(data, db = prisma) {
    return db.adminAction.create({ data });
  },
  transaction(callback) {
    return prisma.$transaction(callback);
  },
};
