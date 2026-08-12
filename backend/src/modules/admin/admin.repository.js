import { prisma } from '../../config/database.js';

const transactionTypes = {
  PAYMENTS: ['TOP_UP', 'COLLABORATION_FUNDING', 'ESCROW_FUNDED', 'BARTER_PLATFORM_FEE'],
  TOP_UPS: ['TOP_UP'],
  COLLABORATION_FUNDING: ['COLLABORATION_FUNDING', 'ESCROW_FUNDED', 'BARTER_PLATFORM_FEE'],
  PLATFORM_FEES: ['COMMISSION_EARNED', 'PLATFORM_COMMISSION_PENDING', 'PLATFORM_COMMISSION_EARNED', 'PLATFORM_BARTER_FEE_PENDING', 'PLATFORM_BARTER_FEE_EARNED'],
  PAYOUTS: ['PAYOUT', 'PAYOUT_SENT'],
  REFUNDS: ['REFUND', 'REFUND_ISSUED'],
};
const revenueSources = {
  COMMISSIONS: ['PAID_COMMISSION', 'HYBRID_COMMISSION'],
  BARTER_SERVICE_FEE: ['BARTER_SERVICE_FEE'],
  OTHER: ['OTHER'],
};
const dateRange = (field, dateFrom, dateTo) => {
  if (!dateFrom && !dateTo) return {};
  const value = {};
  if (dateFrom) value.gte = new Date(`${dateFrom}T00:00:00.000Z`);
  if (dateTo) value.lte = new Date(`${dateTo}T23:59:59.999Z`);
  return { [field]: value };
};
const financeCollaboration = {
  id: true,
  paymentType: true,
  barterDetails: true,
  barterEstimatedValue: true,
  campaign: { select: { id: true, title: true } },
  creator: { select: { id: true, channelName: true, user: { select: { id: true, displayName: true, email: true } } } },
  business: { select: { id: true, companyName: true, user: { select: { id: true, displayName: true, email: true } } } },
};
const safePayment = {
  id: true,
  collaborationId: true,
  type: true,
  compensationType: true,
  status: true,
  amount: true,
  cashAmount: true,
  commissionRate: true,
  commissionAmount: true,
  creatorAmount: true,
  platformFee: true,
  currency: true,
  provider: true,
  providerRef: true,
  processedAt: true,
  fundedAt: true,
  releasedAt: true,
  refundedAt: true,
  createdAt: true,
};
export const adminRepository = {
  transaction(callback) { return prisma.$transaction(callback); },
  overview() {
    return prisma.$transaction([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.creatorProfile.count(),
      prisma.businessProfile.count(),
      prisma.campaign.count(),
      prisma.collaboration.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      prisma.payment.aggregate({ where: { type: 'FUNDING', compensationType: { in: ['PAID', 'HYBRID'] }, fundedAt: { not: null } }, _sum: { cashAmount: true, platformFee: true } }),
      prisma.platformRevenue.aggregate({ _sum: { amount: true }, where: { status: 'EARNED' } }),
      prisma.platformRevenue.groupBy({ by: ['source', 'status'], _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: 'RELEASED' }, _sum: { creatorAmount: true } }),
      prisma.paymentRefund.aggregate({ where: { status: 'REFUNDED' }, _sum: { amount: true } }),
      prisma.paymentPayout.aggregate({ where: { status: { in: ['PENDING', 'PROCESSING'] } }, _sum: { amount: true } }),
      prisma.trustCase.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW', 'ESCALATED'] } } }),
    ]);
  },
  async users({ q, status, page, limit }) {
    const where = { deletedAt: null, ...(status && { status }), ...(q && { OR: [{ email: { contains: q, mode: 'insensitive' } }, { displayName: { contains: q, mode: 'insensitive' } }, { username: { contains: q, mode: 'insensitive' } }] }) };
    return Promise.all([
      prisma.user.findMany({ where, select: { id: true, email: true, username: true, displayName: true, roles: true, status: true, emailVerifiedAt: true, lastSeenAt: true, createdAt: true, creatorProfile: { select: { id: true, channelName: true } }, businessProfile: { select: { id: true, companyName: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.user.count({ where }),
    ]);
  },
  async channels({ q, status, page, limit }) {
    const creatorWhere = { ...(status && { verificationStatus: status }), ...(q && { OR: [{ channelName: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }] }) };
    const businessWhere = { ...(status && { verificationStatus: status }), ...(q && { OR: [{ companyName: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }] }) };
    const [creators, businesses, creatorTotal, businessTotal] = await prisma.$transaction([
      prisma.creatorProfile.findMany({ where: creatorWhere, select: { id: true, channelName: true, slug: true, verificationStatus: true, ratingAverage: true, createdAt: true, user: { select: { id: true, email: true, status: true } } }, orderBy: { createdAt: 'desc' }, take: page * limit }),
      prisma.businessProfile.findMany({ where: businessWhere, select: { id: true, companyName: true, slug: true, verificationStatus: true, ratingAverage: true, createdAt: true, user: { select: { id: true, email: true, status: true } } }, orderBy: { createdAt: 'desc' }, take: page * limit }),
      prisma.creatorProfile.count({ where: creatorWhere }), prisma.businessProfile.count({ where: businessWhere }),
    ]);
    const items = [
      ...creators.map((item) => ({ ...item, type: 'CREATOR', name: item.channelName })),
      ...businesses.map((item) => ({ ...item, type: 'BUSINESS', name: item.companyName })),
    ].sort((a, b) => b.createdAt - a.createdAt).slice((page - 1) * limit, page * limit);
    return [items, creatorTotal + businessTotal];
  },
  async campaigns({ q, status, page, limit }) {
    const where = { ...(status && { status }), ...(q && { OR: [{ title: { contains: q, mode: 'insensitive' } }, { business: { companyName: { contains: q, mode: 'insensitive' } } }] }) };
    return Promise.all([prisma.campaign.findMany({ where, include: { business: { select: { id: true, companyName: true } }, _count: { select: { proposals: true, collaborations: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }), prisma.campaign.count({ where })]);
  },
  async contracts({ q, status, page, limit }) {
    const where = { ...(status && { status }), ...(q && { OR: [{ id: { contains: q, mode: 'insensitive' } }, { collaboration: { campaign: { title: { contains: q, mode: 'insensitive' } } } }] }) };
    return Promise.all([prisma.contract.findMany({ where, include: { collaboration: { select: { status: true, campaign: { select: { title: true } }, creator: { select: { channelName: true } }, business: { select: { companyName: true } }, payments: { select: { amount: true, type: true, status: true } } } } }, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * limit, take: limit }), prisma.contract.count({ where })]);
  },
  async offers({ q, status, page, limit }) {
    const where = { ...(status && { status }), ...(q && { OR: [{ title: { contains: q, mode: 'insensitive' } }, { creator: { channelName: { contains: q, mode: 'insensitive' } } }, { business: { companyName: { contains: q, mode: 'insensitive' } } }] }) };
    return Promise.all([
      prisma.workOffer.findMany({ where, include: { creator: { select: { id: true, channelName: true } }, business: { select: { id: true, companyName: true } }, campaign: { select: { id: true, title: true } } }, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.workOffer.count({ where }),
    ]);
  },
  async collaborations({ q, status, page, limit }) {
    const where = { ...(status && { status }), ...(q && { OR: [{ id: { contains: q, mode: 'insensitive' } }, { creator: { channelName: { contains: q, mode: 'insensitive' } } }, { business: { companyName: { contains: q, mode: 'insensitive' } } }, { campaign: { title: { contains: q, mode: 'insensitive' } } }] }) };
    return Promise.all([
      prisma.collaboration.findMany({ where, include: { creator: { select: { id: true, channelName: true } }, business: { select: { id: true, companyName: true } }, campaign: { select: { id: true, title: true } }, contract: { select: { id: true, status: true } }, _count: { select: { workspaceTasks: true, deliverables: true, payments: true } } }, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.collaboration.count({ where }),
    ]);
  },
  async content({ q, status, page, limit }) {
    const where = { deletedAt: null, ...(status && { status }), ...(q && { OR: [{ title: { contains: q, mode: 'insensitive' } }, { caption: { contains: q, mode: 'insensitive' } }, { creator: { channelName: { contains: q, mode: 'insensitive' } } }, { business: { companyName: { contains: q, mode: 'insensitive' } } }] }) };
    return Promise.all([
      prisma.contentPost.findMany({ where, include: { creator: { select: { id: true, channelName: true } }, business: { select: { id: true, companyName: true } }, media: { orderBy: { sortOrder: 'asc' }, take: 1, include: { mediaAsset: { select: { url: true, mimeType: true } } } } }, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.contentPost.count({ where }),
    ]);
  },
  settings() { return prisma.platformSetting.findMany({ orderBy: { key: 'asc' } }); },
  featureFlags() { return prisma.featureFlag.findMany({ orderBy: { key: 'asc' } }); },
  async payments({ q, status, page, limit }) {
    const where = { ...(status && { status }), ...(q && { OR: [{ id: { contains: q, mode: 'insensitive' } }, { providerRef: { contains: q, mode: 'insensitive' } }] }) };
    return Promise.all([prisma.payment.findMany({ where, include: { refundRequests: true, payoutRequests: true, collaboration: { select: { campaign: { select: { title: true } }, creator: { select: { channelName: true } }, business: { select: { companyName: true } } } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }), prisma.payment.count({ where })]);
  },
  async refunds({ q, status, page, limit }) {
    const where = { ...(status && { status }), ...(q && { OR: [{ id: { contains: q, mode: 'insensitive' } }, { providerRef: { contains: q, mode: 'insensitive' } }] }) };
    return Promise.all([
      prisma.paymentRefund.findMany({ where, include: { requester: { select: { displayName: true, email: true } }, payment: { select: { currency: true, collaboration: { select: { campaign: { select: { title: true } } } } } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.paymentRefund.count({ where }),
    ]);
  },
  async payouts({ q, status, page, limit }) {
    const where = { ...(status && { status }), ...(q && { OR: [{ id: { contains: q, mode: 'insensitive' } }, { providerRef: { contains: q, mode: 'insensitive' } }] }) };
    return Promise.all([
      prisma.paymentPayout.findMany({ where, include: { creator: { select: { displayName: true, email: true } }, payoutAccount: { select: { provider: true, accountName: true, bankCode: true, last4: true } }, payment: { select: { currency: true, collaboration: { select: { campaign: { select: { title: true } } } } } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.paymentPayout.count({ where }),
    ]);
  },
  async ledger({ q, page, limit }) {
    const where = q ? { OR: [{ id: { contains: q, mode: 'insensitive' } }, { idempotencyKey: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] } : {};
    return Promise.all([
      prisma.ledgerEntry.findMany({ where, include: { debitAccount: { select: { code: true, type: true } }, creditAccount: { select: { code: true, type: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.ledgerEntry.count({ where }),
    ]);
  },
  async revenue({ q, status, page, limit }) {
    const where = { ...(status && { status }), ...(q && { OR: [{ id: { contains: q, mode: 'insensitive' } }, { collaboration: { campaign: { title: { contains: q, mode: 'insensitive' } } } }] }) };
    return Promise.all([
      prisma.platformRevenue.findMany({ where, include: { collaboration: { select: { paymentType: true, barterDetails: true, barterEstimatedValue: true, campaign: { select: { title: true } }, creator: { select: { channelName: true } }, business: { select: { companyName: true } } } }, payment: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.platformRevenue.count({ where }),
    ]);
  },
  async barterFees({ q, status, page, limit }) {
    const where = { source: 'BARTER_SERVICE_FEE', ...(status && { status }), ...(q && { collaboration: { OR: [{ campaign: { title: { contains: q, mode: 'insensitive' } } }, { business: { companyName: { contains: q, mode: 'insensitive' } } }, { creator: { channelName: { contains: q, mode: 'insensitive' } } }] } }) };
    return Promise.all([
      prisma.platformRevenue.findMany({ where, include: { collaboration: { select: { paymentType: true, barterDetails: true, barterEstimatedValue: true, campaign: { select: { title: true } }, creator: { select: { channelName: true } }, business: { select: { companyName: true } } } }, payment: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.platformRevenue.count({ where }),
    ]);
  },
  financeOverview() {
    return prisma.$transaction([
      prisma.payment.aggregate({
        where: { type: 'FUNDING', compensationType: { in: ['PAID', 'HYBRID'] }, fundedAt: { not: null } },
        _sum: { cashAmount: true },
      }),
      prisma.platformRevenue.groupBy({ by: ['source', 'status', 'currency'], _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: 'RELEASED' }, _sum: { creatorAmount: true } }),
      prisma.paymentPayout.aggregate({ where: { status: { in: ['PENDING', 'PROCESSING'] } }, _sum: { amount: true } }),
      prisma.paymentRefund.aggregate({ where: { status: 'REFUNDED' }, _sum: { amount: true } }),
      prisma.payment.aggregate({
        where: {
          type: { in: ['FUNDING', 'BARTER_PLATFORM_FEE'] },
          status: { in: ['FUNDED', 'PARTIALLY_REFUNDED'] },
        },
        _sum: { amount: true },
      }),
    ]);
  },
  async financeTransactions({ q, type, currency, dateFrom, dateTo, page, limit }) {
    const where = {
      ...(type && { type: { in: transactionTypes[type] } }),
      ...(currency && { currency }),
      ...dateRange('occurredAt', dateFrom, dateTo),
      ...(q && { OR: [
        { id: { contains: q, mode: 'insensitive' } },
        { postingBatchId: { contains: q, mode: 'insensitive' } },
        { paymentId: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { payment: { providerRef: { contains: q, mode: 'insensitive' } } },
        { collaboration: { campaign: { title: { contains: q, mode: 'insensitive' } } } },
        { collaboration: { business: { companyName: { contains: q, mode: 'insensitive' } } } },
        { collaboration: { creator: { channelName: { contains: q, mode: 'insensitive' } } } },
      ] }),
    };
    const include = {
      debitAccount: { select: { code: true, type: true, owner: { select: { id: true, displayName: true, email: true } } } },
      creditAccount: { select: { code: true, type: true, owner: { select: { id: true, displayName: true, email: true } } } },
      collaboration: { select: financeCollaboration },
      payment: { select: safePayment },
    };
    return Promise.all([
      prisma.ledgerEntry.findMany({ where, include, orderBy: { occurredAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.ledgerEntry.count({ where }),
    ]);
  },
  async financeRevenue({ q, status, source, currency, dateFrom, dateTo, page, limit }) {
    const where = {
      ...(status && { status }),
      ...(source && { source: { in: revenueSources[source] } }),
      ...(currency && { currency }),
      ...dateRange('createdAt', dateFrom, dateTo),
      ...(q && { OR: [
        { id: { contains: q, mode: 'insensitive' } },
        { collaboration: { campaign: { title: { contains: q, mode: 'insensitive' } } } },
        { collaboration: { business: { companyName: { contains: q, mode: 'insensitive' } } } },
        { collaboration: { creator: { channelName: { contains: q, mode: 'insensitive' } } } },
      ] }),
    };
    return Promise.all([
      prisma.platformRevenue.findMany({ where, include: { collaboration: { select: financeCollaboration }, payment: { select: safePayment } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.platformRevenue.count({ where }),
      prisma.platformRevenue.groupBy({ by: ['source', 'status', 'currency'], where, _sum: { amount: true } }),
    ]);
  },
  async financePayouts({ q, status, currency, dateFrom, dateTo, page, limit }) {
    const where = {
      ...(status && { status }),
      ...(currency && { payment: { currency } }),
      ...dateRange('createdAt', dateFrom, dateTo),
      ...(q && { OR: [
        { id: { contains: q, mode: 'insensitive' } },
        { providerRef: { contains: q, mode: 'insensitive' } },
        { creator: { OR: [{ displayName: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } },
        { payment: { collaboration: { campaign: { title: { contains: q, mode: 'insensitive' } } } } },
      ] }),
    };
    const include = {
      creator: { select: { id: true, displayName: true, email: true } },
      payoutAccount: { select: { provider: true, accountName: true, bankCode: true, last4: true, currency: true } },
      payment: { select: { ...safePayment, collaboration: { select: financeCollaboration } } },
    };
    return Promise.all([
      prisma.paymentPayout.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.paymentPayout.count({ where }),
      prisma.paymentPayout.groupBy({ by: ['status'], where, _sum: { amount: true } }),
    ]);
  },
  async financeRefunds({ q, status, currency, dateFrom, dateTo, page, limit }) {
    const where = {
      ...(status && { status }),
      ...(currency && { payment: { currency } }),
      ...dateRange('createdAt', dateFrom, dateTo),
      ...(q && { OR: [
        { id: { contains: q, mode: 'insensitive' } },
        { providerRef: { contains: q, mode: 'insensitive' } },
        { reason: { contains: q, mode: 'insensitive' } },
        { requester: { OR: [{ displayName: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } },
        { payment: { collaboration: { campaign: { title: { contains: q, mode: 'insensitive' } } } } },
      ] }),
    };
    const include = {
      requester: { select: { id: true, displayName: true, email: true } },
      payment: { select: { ...safePayment, collaboration: { select: financeCollaboration } } },
    };
    return Promise.all([
      prisma.paymentRefund.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.paymentRefund.count({ where }),
    ]);
  },
  financeDetail(resource, id) {
    if (resource === 'transactions') return prisma.ledgerEntry.findUnique({ where: { id }, include: { debitAccount: { select: { code: true, type: true, owner: { select: { id: true, displayName: true, email: true } } } }, creditAccount: { select: { code: true, type: true, owner: { select: { id: true, displayName: true, email: true } } } }, collaboration: { select: financeCollaboration }, payment: { select: safePayment } } });
    if (resource === 'revenue') return prisma.platformRevenue.findUnique({ where: { id }, include: { collaboration: { select: financeCollaboration }, payment: { select: safePayment } } });
    if (resource === 'payouts') return prisma.paymentPayout.findUnique({ where: { id }, include: { creator: { select: { id: true, displayName: true, email: true } }, payoutAccount: { select: { provider: true, accountName: true, bankCode: true, last4: true, currency: true } }, payment: { select: { ...safePayment, collaboration: { select: financeCollaboration } } } } });
    return prisma.paymentRefund.findUnique({ where: { id }, include: { requester: { select: { id: true, displayName: true, email: true } }, payment: { select: { ...safePayment, collaboration: { select: financeCollaboration } } } } });
  },
  async cases({ q, status, kind, page, limit }) {
    const where = { ...(status && { status }), ...(kind && { kind }), ...(q && { OR: [{ reason: { contains: q, mode: 'insensitive' } }, { targetId: { contains: q, mode: 'insensitive' } }] }) };
    return Promise.all([prisma.trustCase.findMany({ where, include: { reporter: { select: { id: true, displayName: true, email: true } }, assignedAdmin: { select: { id: true, displayName: true } } }, orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }], skip: (page - 1) * limit, take: limit }), prisma.trustCase.count({ where })]);
  },
  async reviews({ q, status, page, limit }) {
    const where = {
      ...(status === 'Published' && { publishedAt: { not: null } }),
      ...(status === 'Pending' && { publishedAt: null }),
      ...(q && { comment: { contains: q, mode: 'insensitive' } }),
    };
    return Promise.all([
      prisma.review.findMany({
        where,
        include: { reviewer: { select: { id: true, displayName: true } }, subject: { select: { id: true, displayName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);
  },
  async audit({ q, page, limit }) {
    const where = q ? { OR: [{ action: { contains: q, mode: 'insensitive' } }, { targetType: { contains: q, mode: 'insensitive' } }, { targetId: { contains: q, mode: 'insensitive' } }, { reason: { contains: q, mode: 'insensitive' } }] } : {};
    return Promise.all([prisma.adminAction.findMany({ where, include: { actor: { select: { id: true, displayName: true, email: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }), prisma.adminAction.count({ where })]);
  },
};
