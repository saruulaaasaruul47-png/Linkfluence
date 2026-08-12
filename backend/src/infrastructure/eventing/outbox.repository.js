import { prisma } from '../../config/database.js';

export const outboxRepository = {
  async claim(limit, lockTimeoutMs) {
    const now = new Date();
    const expiredLock = new Date(now.getTime() - lockTimeoutMs);
    return prisma.$transaction(async (tx) => {
      const candidates = await tx.outboxEvent.findMany({
        where: {
          processedAt: null,
          deadLetteredAt: null,
          nextAttemptAt: { lte: now },
          OR: [{ lockedAt: null }, { lockedAt: { lt: expiredLock } }],
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        select: { id: true },
      });
      if (!candidates.length) return [];
      const ids = candidates.map((item) => item.id);
      await tx.outboxEvent.updateMany({
        where: { id: { in: ids }, processedAt: null, deadLetteredAt: null },
        data: { lockedAt: now },
      });
      return tx.outboxEvent.findMany({ where: { id: { in: ids }, lockedAt: now } });
    });
  },
  processed(id) {
    return prisma.outboxEvent.update({
      where: { id },
      data: { processedAt: new Date(), lockedAt: null, lastError: null },
    });
  },
  failed(id, attempts, error, nextAttemptAt, deadLetteredAt) {
    return prisma.outboxEvent.update({
      where: { id },
      data: {
        attempts,
        lastError: String(error?.message || error).slice(0, 2000),
        nextAttemptAt,
        deadLetteredAt,
        lockedAt: null,
      },
    });
  },
};
