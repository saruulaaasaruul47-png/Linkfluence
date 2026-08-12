import asyncHandler from 'express-async-handler';
import { healthService } from './health.service.js';

export const healthController = {
  live: (_req, res) => res.status(200).json({ success: true, message: 'API process is live.', data: healthService.live() }),
  ready: asyncHandler(async (_req, res) => {
    const result = await healthService.ready();
    res.status(result.ready ? 200 : 503).json({ success: result.ready, message: result.ready ? 'API is ready.' : 'API is not ready.', data: result });
  }),
};

