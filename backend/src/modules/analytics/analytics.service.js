import { AppError } from '../../shared/errors/AppError.js';
import { analyticsRepository } from './analytics.repository.js';
import PDFDocument from 'pdfkit';
const rangeDays = { '1D': 1, '7D': 7, '1M': 30, '3M': 90, '1Y': 365, ALL: null };
const amount = (items, test) => items.flatMap((item) => item.payments).filter(test).reduce((sum, item) => sum + Number(item.amount), 0);
export const analyticsService = {
  async summary(userId, { range, role: requestedRole }) {
    const user = await analyticsRepository.user(userId);
    const role = requestedRole || (user?.businessProfile ? 'business' : 'creator');
    if (!user?.[`${role}Profile`]) throw new AppError(`A ${role} channel is required.`, 403, 'CHANNEL_REQUIRED');
    const days = rangeDays[range];
    const since = days ? new Date(Date.now() - days * 86_400_000) : null;
    const collaborations = await analyticsRepository.collaborations(userId, since, role);
    const funded = amount(collaborations, (item) => item.type === 'FUNDING' && ['FUNDED', 'RELEASED'].includes(item.status));
    const released = amount(collaborations, (item) => item.type === 'MILESTONE_RELEASE' && item.status === 'RELEASED');
    const completed = collaborations.filter((item) => item.status === 'COMPLETED').length;
    const active = collaborations.filter((item) => item.status !== 'COMPLETED' && item.status !== 'CANCELLED').length;
    const profile = user[`${role}Profile`];
    const groups = new Map();
    collaborations.forEach((item) => {
      const key = new Date(item.createdAt).toISOString().slice(0, 10);
      const current = groups.get(key) || { date: key, collaborations: 0, funded: 0, released: 0, deliverables: 0 };
      current.collaborations += 1;
      current.funded += amount([item], (payment) => payment.type === 'FUNDING' && payment.status === 'FUNDED');
      current.released += amount([item], (payment) => payment.type === 'MILESTONE_RELEASE' && payment.status === 'RELEASED');
      current.deliverables += item.deliverables.length;
      groups.set(key, current);
    });
    return {
      range, role,
      metrics: { collaborations: collaborations.length, active, completed, funded, released, rating: Number(profile.ratingAverage || 0), ratingCount: profile.ratingCount },
      series: [...groups.values()],
      topCampaigns: collaborations.slice().sort((a, b) => b.deliverables.length - a.deliverables.length).slice(0, 5).map((item) => ({ id: item.campaign?.id || item.id, title: item.campaign?.title || 'Direct collaboration', deliverables: item.deliverables.length, status: item.status })),
    };
  },
  track(userId, payload) { return analyticsRepository.createEvent(userId, payload); },
  async campaignReport(actor, campaignId) {
    const campaign = await analyticsRepository.campaignReport(campaignId);
    if (!campaign) throw new AppError('Campaign was not found.', 404, 'CAMPAIGN_NOT_FOUND');
    if (campaign.business.userId !== actor.id && !actor.roles.includes('ADMIN')) {
      throw new AppError('Campaign was not found.', 404, 'CAMPAIGN_NOT_FOUND');
    }
    return buildCampaignReport(campaign);
  },
  async campaignReportPdf(actor, campaignId) {
    const report = await this.campaignReport(actor, campaignId);
    const buffer = await renderCampaignReportPdf(report);
    await analyticsRepository.auditReport(actor.id, campaignId, 'PDF');
    return { report, buffer };
  },
};

function metricValue(metrics, keys) {
  for (const key of keys) {
    const value = Number(metrics?.[key]);
    if (Number.isFinite(value) && value >= 0) return value;
  }
  return 0;
}

function buildCampaignReport(campaign) {
  const creators = campaign.collaborations.map((collaboration) => {
    const proofMetrics = collaboration.publishProofs.reduce((result, proof) => ({
      reach: result.reach + metricValue(proof.metrics, ['reach', 'accountsReached']),
      views: result.views + metricValue(proof.metrics, ['views', 'impressions', 'plays']),
      engagement: result.engagement + metricValue(proof.metrics, ['engagement', 'engagementCount', 'interactions']),
    }), { reach: 0, views: 0, engagement: 0 });
    const latestSocial = collaboration.creator.socialAccounts.map((account) => account.stats[0]).filter(Boolean);
    const reach = proofMetrics.reach || latestSocial.reduce((sum, stat) => sum + Number(stat.reach || 0), 0);
    const views = proofMetrics.views || latestSocial.reduce((sum, stat) => sum + Number(stat.impressions || 0), 0);
    const engagement = proofMetrics.engagement || latestSocial.reduce((sum, stat) => sum + Number(stat.engagementCount || 0), 0);
    const spend = collaboration.payments
      .filter((payment) => payment.type === 'FUNDING' && ['FUNDED', 'RELEASED', 'PAID'].includes(payment.status))
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    return {
      creatorId: collaboration.creator.id,
      creator: collaboration.creator.channelName,
      collaborationId: collaboration.id,
      status: collaboration.status,
      reach, views, engagement, spend,
      engagementRate: reach > 0 ? Number(((engagement / reach) * 100).toFixed(2)) : 0,
      deliverables: collaboration.deliverables,
      proofLinks: collaboration.publishProofs.map((proof) => ({
        id: proof.id, url: proof.postUrl, platform: proof.platform, status: proof.status,
        screenshotUrl: proof.screenshot ? `/api/v1/media/assets/${proof.screenshot.id}/content` : null,
        deliverable: proof.deliverable,
      })),
    };
  });
  const totals = creators.reduce((result, item) => ({ reach: result.reach + item.reach, views: result.views + item.views, engagement: result.engagement + item.engagement, spend: result.spend + item.spend }), { reach: 0, views: 0, engagement: 0, spend: 0 });
  return {
    campaign: { id: campaign.id, title: campaign.title, business: campaign.business.companyName, currency: campaign.currency, status: campaign.status, deadline: campaign.deadline },
    totals: {
      ...totals,
      cpm: totals.views > 0 ? Number(((totals.spend / totals.views) * 1000).toFixed(2)) : 0,
      cpe: totals.engagement > 0 ? Number((totals.spend / totals.engagement).toFixed(2)) : 0,
      engagementRate: totals.reach > 0 ? Number(((totals.engagement / totals.reach) * 100).toFixed(2)) : 0,
    },
    creators,
    generatedAt: new Date().toISOString(),
  };
}

function renderCampaignReportPdf(report) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `${report.campaign.title} campaign report` } });
    const chunks = [];
    document.on('data', (chunk) => chunks.push(chunk));
    document.on('error', reject);
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.fontSize(10).fillColor('#777').text('INFLUENCE HUB · CAMPAIGN REPORT');
    document.moveDown(0.7).fontSize(24).fillColor('#111').text(report.campaign.title);
    document.fontSize(11).fillColor('#555').text(`${report.campaign.business} · ${report.campaign.status} · Generated ${new Date(report.generatedAt).toLocaleString('en-US')}`);
    document.moveDown(1.4);
    const metrics = [['Reach', report.totals.reach], ['Views', report.totals.views], ['Engagement', report.totals.engagement], ['Spend', `${report.totals.spend.toLocaleString()} ${report.campaign.currency}`], ['CPM', report.totals.cpm], ['CPE', report.totals.cpe]];
    metrics.forEach(([label, value]) => document.fontSize(10).fillColor('#777').text(label, { continued: true }).fillColor('#111').text(`  ${value}`));
    document.moveDown(1.4).fontSize(16).text('Creator breakdown');
    report.creators.forEach((creator) => {
      document.moveDown(0.8).fontSize(12).fillColor('#111').text(creator.creator);
      document.fontSize(9).fillColor('#555').text(`Reach ${creator.reach} · Views ${creator.views} · Engagement ${creator.engagement} · Spend ${creator.spend.toLocaleString()} ${report.campaign.currency}`);
      creator.proofLinks.forEach((proof) => document.fillColor('#3355aa').text(`${proof.platform}: ${proof.url}`, { link: proof.url, underline: true }));
    });
    document.end();
  });
}
