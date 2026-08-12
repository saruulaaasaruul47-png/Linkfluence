import { prisma } from '../../config/database.js';

export const jobRepository = {
  async acquire(name, ownerId, leaseMs, now = new Date()) {
    const expiresAt = new Date(now.getTime() + leaseMs);
    try {
      await prisma.jobLease.create({ data: { name, ownerId, expiresAt } });
      return true;
    } catch (error) {
      if (error?.code !== 'P2002') throw error;
    }
    const claimed = await prisma.jobLease.updateMany({
      where: { name, expiresAt: { lt: now } },
      data: { ownerId, expiresAt },
    });
    return claimed.count === 1;
  },
  renew(name, ownerId, leaseMs) {
    return prisma.jobLease.updateMany({ where: { name, ownerId }, data: { expiresAt: new Date(Date.now() + leaseMs) } });
  },
  release(name, ownerId) {
    return prisma.jobLease.deleteMany({ where: { name, ownerId } });
  },
  startRun(jobName, ownerId) {
    return prisma.jobRun.create({ data: { jobName, ownerId, status: 'RUNNING' } });
  },
  skippedRun(jobName, ownerId) {
    return prisma.jobRun.create({ data: { jobName, ownerId, status: 'SKIPPED', metrics: { reason: 'lease_held' }, finishedAt: new Date() } });
  },
  finishRun(id, status, attempt, metrics, error = null) {
    return prisma.jobRun.update({ where: { id }, data: { status, attempt, metrics: metrics || undefined, error, finishedAt: new Date() } });
  },
  cleanupExpired(now, retentionBefore) {
    return prisma.$transaction(async (tx) => {
      const verificationCodes = await tx.verificationCode.deleteMany({
        where: { OR: [{ expiresAt: { lt: now } }, { consumedAt: { lt: retentionBefore } }] },
      });
      const authTokens = await tx.authToken.deleteMany({
        where: { OR: [{ expiresAt: { lt: now } }, { revokedAt: { lt: retentionBefore } }] },
      });
      const outboxEvents = await tx.outboxEvent.deleteMany({
        where: { OR: [{ processedAt: { lt: retentionBefore } }, { deadLetteredAt: { lt: retentionBefore } }] },
      });
      return { verificationCodes: verificationCodes.count, authTokens: authTokens.count, outboxEvents: outboxEvents.count };
    });
  },
  async aggregateAnalytics(date, start, end) {
    const [events, users, posts, collaborations, payments] = await prisma.$transaction([
      prisma.analyticsEvent.groupBy({ by: ['name'], where: { occurredAt: { gte: start, lt: end } }, _count: { _all: true } }),
      prisma.user.count({ where: { createdAt: { gte: start, lt: end }, deletedAt: null } }),
      prisma.contentPost.count({ where: { publishedAt: { gte: start, lt: end }, deletedAt: null } }),
      prisma.collaboration.count({ where: { createdAt: { gte: start, lt: end } } }),
      prisma.payment.aggregate({ where: { createdAt: { gte: start, lt: end } }, _count: { _all: true }, _sum: { amount: true, platformFee: true } }),
    ]);
    const metrics = {
      events: Object.fromEntries(events.map((item) => [item.name, item._count._all])),
      newUsers: users,
      publishedPosts: posts,
      newCollaborations: collaborations,
      paymentCount: payments._count._all,
      paymentVolume: Number(payments._sum.amount || 0),
      platformFees: Number(payments._sum.platformFee || 0),
    };
    await prisma.analyticsDailyRollup.upsert({ where: { date }, create: { date, metrics }, update: { metrics } });
    return metrics;
  },
};

