import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { corsOptions } from './config/cors.js';
import { errorHandler } from './shared/errors/errorHandler.js';
import { notFoundHandler } from './shared/errors/notFoundHandler.js';
import { apiRouter } from './routes/index.js';
import { requestContext } from './shared/middleware/requestContext.js';
import { apiLimiter } from './shared/middleware/rateLimiters.js';
import { enforceMaintenanceMode } from './modules/operations/maintenance.middleware.js';
import { seoRouter } from './modules/seo/index.js';

export const app = express();

app.disable('x-powered-by');
app.use(requestContext);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors(corsOptions));
app.use('/api/v1/payments/webhooks/stripe', express.raw({ type: 'application/json', limit: '200kb' }));
app.use('/api/v1/social-connections/webhooks/meta', express.raw({ type: 'application/json', limit: '200kb' }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser());
app.use(seoRouter);
app.use('/uploads/media', (_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Media asset was not found.', details: null } });
});
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads'), {
  dotfiles: 'deny',
  index: false,
  maxAge: '7d',
}));
app.use('/api/v1', apiLimiter, enforceMaintenanceMode, apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
