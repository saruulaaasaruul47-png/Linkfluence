import { prisma } from '../../config/database.js';
export const analyticsRepository = {
  transaction(callback) { return prisma.$transaction(callback); },
  user(userId) {
    return prisma.user.findUnique({ where: { id: userId }, select: { creatorProfile: { select: { id: true, ratingAverage: true, ratingCount: true } }, businessProfile: { select: { id: true, ratingAverage: true, ratingCount: true } } } });
  },
  collaborations(userId, since, role) {
    return prisma.collaboration.findMany({
      where: {
        ...(role === 'business' ? { business: { userId } } : { creator: { userId } }),
        ...(since && { createdAt: { gte: since } }),
      },
      include: { payments: true, deliverables: true, reviews: true, campaign: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'asc' },
    });
  },
  createEvent(userId, payload) { return prisma.analyticsEvent.create({ data: { userId, ...payload } }); },
  campaignReport(campaignId) {
    return prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        business: { select: { userId: true, companyName: true } },
        collaborations: {
          include: {
            creator: {
              select: {
                id: true, userId: true, channelName: true,
                socialAccounts: { include: { stats: { orderBy: { capturedAt: 'desc' }, take: 1 } } },
              },
            },
            payments: true,
            publishProofs: { include: { screenshot: { select: { id: true } }, deliverable: { select: { id: true, title: true } } } },
            deliverables: { select: { id: true, title: true, status: true } },
          },
        },
      },
    });
  },
  auditReport(userId, campaignId, format) {
    return prisma.analyticsEvent.create({ data: { userId, name: 'campaign_report_exported', resourceType: 'CAMPAIGN', resourceId: campaignId, properties: { format } } });
  },
};
