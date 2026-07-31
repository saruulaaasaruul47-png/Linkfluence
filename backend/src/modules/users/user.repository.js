import { prisma } from '../../config/database.js';

const profileIncludes = {
  creatorProfile: { select: { id: true } },
  businessProfile: { select: { id: true } },
};

export const userRepository = {
  findById(id, db = prisma) {
    return db.user.findUnique({ where: { id }, include: profileIncludes });
  },

  findByUsername(username, db = prisma) {
    return db.user.findUnique({ where: { username }, select: { id: true } });
  },

  update(id, data, db = prisma) {
    return db.user.update({ where: { id }, data, include: profileIncludes });
  },

  async updatePasswordAndRevokeSessions(id, passwordHash) {
    return prisma.$transaction(async (tx) => {
      const user = await this.update(id, {
        passwordHash,
        sessionVersion: { increment: 1 },
      }, tx);
      await tx.authToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return user;
    });
  },

  async softDeleteAndRevokeSessions(id) {
    return prisma.$transaction(async (tx) => {
      const user = await this.update(id, {
        deletedAt: new Date(),
        status: 'BANNED',
        sessionVersion: { increment: 1 },
      }, tx);
      await tx.authToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return user;
    });
  },
};
