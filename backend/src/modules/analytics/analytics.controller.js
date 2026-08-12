import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { analyticsService } from './analytics.service.js';
export const analyticsController = {
  summary: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Analytics retrieved.', await analyticsService.summary(req.user.id, req.validated.query))),
  campaignReport: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Campaign report retrieved.', { report: await analyticsService.campaignReport(req.user, req.validated.params.campaignId) })),
  campaignReportPdf: asyncHandler(async (req, res) => {
    const result = await analyticsService.campaignReportPdf(req.user, req.validated.params.campaignId);
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="campaign-${result.report.campaign.id}-report.pdf"`);
    res.set('Cache-Control', 'private, no-store');
    res.send(result.buffer);
  }),
  track: asyncHandler(async (req, res) => sendSuccess(res, 202, 'Analytics event accepted.', { event: await analyticsService.track(req.user.id, req.validated.body) })),
};
