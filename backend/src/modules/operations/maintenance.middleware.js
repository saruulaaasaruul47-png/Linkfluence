import asyncHandler from 'express-async-handler';
import { getSetting } from './platform-config.service.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const enforceMaintenanceMode = asyncHandler(async (req, res, next) => {
  if (SAFE_METHODS.has(req.method) || req.path.startsWith('/health') || req.path.startsWith('/admin') || req.path.startsWith('/auth')) return next();
  if (!(await getSetting('maintenance'))) return next();
  res.status(503).json({
    success: false,
    error: { code: 'PLATFORM_MAINTENANCE', message: 'The platform is temporarily in maintenance mode.' },
  });
});

