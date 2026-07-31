import { prisma } from '../../config/database.js';

const profileIncludes = {
  creatorProfile: { select: { id: true } },
  businessProfile: { select: { id: true } },
};

export const authRepository = {
  findUserByEmail(email, db = prisma) {
    return db.user.findUnique({ where: { email }, include: profileIncludes });
  },

  findUserByUsername(username, db = prisma) {
    return db.user.findUnique({ where: { username }, include: profileIncludes });
  },

  findUserById(id, db = prisma) {
    return db.user.findUnique({ where: { id }, include: profileIncludes });
  },

  createPendingUser(data, db = prisma) {
    return db.user.create({ data, include: profileIncludes });
  },

  activateUser(userId, db = prisma) {
    return db.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
      include: profileIncludes,
    });
  },

  updateLastSeen(userId, date, db = prisma) {
    return db.user.update({
      where: { id: userId },
      data: { lastSeenAt: date },
      include: profileIncludes,
    });
  },

  invalidateVerificationCodes(userId, purpose, db = prisma) {
    return db.verificationCode.updateMany({
      where: { userId, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });
  },

  createVerificationCode(data, db = prisma) {
    return db.verificationCode.create({ data });
  },

  findLatestActiveVerificationCode(userId, purpose, db = prisma) {
    return db.verificationCode.findFirst({
      where: { userId, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  },

  findLatestVerificationCode(userId, purpose, db = prisma) {
    return db.verificationCode.findFirst({
      where: { userId, purpose },
      orderBy: { createdAt: 'desc' },
    });
  },

  incrementVerificationAttempts(codeId, db = prisma) {
    return db.verificationCode.update({
      where: { id: codeId },
      data: { attempts: { increment: 1 } },
    });
  },

  consumeVerificationCode(codeId, consumedAt, db = prisma) {
    return db.verificationCode.update({
      where: { id: codeId },
      data: { consumedAt },
    });
  },

  createAuthToken(data, db = prisma) {
    return db.authToken.create({ data });
  },

  findAuthTokenByHash(tokenHash, db = prisma) {
    return db.authToken.findUnique({
      where: { tokenHash },
      include: { user: { include: profileIncludes } },
    });
  },

  findAuthTokenByHashAndJti(tokenHash, jti, db = prisma) {
    return db.authToken.findFirst({
      where: { tokenHash, jti },
      include: { user: { include: profileIncludes } },
    });
  },

  revokeAuthToken(tokenId, revokedAt = new Date(), db = prisma) {
    return db.authToken.updateMany({
      where: { id: tokenId, revokedAt: null },
      data: { revokedAt },
    });
  },

  revokeUserRefreshTokens(userId, db = prisma) {
    return db.authToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  revokeTokenFamily(userId, familyId, db = prisma) {
    return db.authToken.updateMany({
      where: { userId, familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  deleteExpiredAuthTokens(db = prisma) {
    return db.authToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  },

  deleteExpiredVerificationCodes(db = prisma) {
    return db.verificationCode.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  },

  async createPendingUserWithCode(userData, codeData) {
    return prisma.$transaction(async (tx) => {
      const user = await this.createPendingUser(userData, tx);
      await this.invalidateVerificationCodes(user.id, codeData.purpose, tx);
      await this.createVerificationCode({ ...codeData, userId: user.id }, tx);
      return user;
    });
  },

  async replaceVerificationCode(userId, codeData) {
    return prisma.$transaction(async (tx) => {
      await this.invalidateVerificationCodes(userId, codeData.purpose, tx);
      return this.createVerificationCode({ ...codeData, userId }, tx);
    });
  },

  async activateUserWithSession(userId, codeId, tokenData) {
    return prisma.$transaction(async (tx) => {
      const consumed = await tx.verificationCode.updateMany({
        where: { id: codeId, userId, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) throw new Error('VERIFICATION_CODE_ALREADY_USED');

      const user = await this.activateUser(userId, tx);
      await this.createAuthToken(tokenData, tx);
      return user;
    });
  },

  async rotateAuthToken(oldTokenId, newTokenData) {
    return prisma.$transaction(async (tx) => {
      const revoked = await tx.authToken.updateMany({
        where: { id: oldTokenId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (revoked.count !== 1) return null;
      const replacement = await this.createAuthToken(newTokenData, tx);
      await tx.authToken.update({
        where: { id: oldTokenId },
        data: { replacedById: replacement.id },
      });
      return replacement;
    });
  },

  async invalidateCompromisedFamily(userId, familyId) {
    return prisma.$transaction(async (tx) => {
      await this.revokeTokenFamily(userId, familyId, tx);
      await tx.user.update({
        where: { id: userId },
        data: { sessionVersion: { increment: 1 } },
      });
    });
  },

  async logoutAll(userId) {
    return prisma.$transaction(async (tx) => {
      await this.revokeUserRefreshTokens(userId, tx);
      await tx.user.update({
        where: { id: userId },
        data: { sessionVersion: { increment: 1 } },
      });
    });
  },

  async consumeResetCode(codeId, userId) {
    const consumed = await prisma.verificationCode.updateMany({
      where: { id: codeId, userId, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return consumed.count === 1;
  },

  async resetPasswordAndRevokeSessions(userId, expectedSessionVersion, passwordHash) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: {
          id: userId,
          sessionVersion: expectedSessionVersion,
          status: 'ACTIVE',
          deletedAt: null,
        },
        data: {
          passwordHash,
          sessionVersion: { increment: 1 },
        },
      });
      if (updated.count !== 1) return false;
      await this.revokeUserRefreshTokens(userId, tx);
      return true;
    });
  },
};
