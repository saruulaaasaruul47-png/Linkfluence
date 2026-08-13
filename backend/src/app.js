import cookieParser from 'cookie-parser';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { corsOptions } from './config/cors.js';
import { env } from './config/env.js';
import { errorHandler } from './shared/errors/errorHandler.js';
import { notFoundHandler } from './shared/errors/notFoundHandler.js';
import { apiRouter } from './routes/index.js';
import { requestContext } from './shared/middleware/requestContext.js';
import { apiLimiter } from './shared/middleware/rateLimiters.js';
import { enforceMaintenanceMode } from './modules/operations/maintenance.middleware.js';
import { healthRouter } from './modules/operations/index.js';
import { seoRouter } from './modules/seo/index.js';
import { apiDocsRouter } from './modules/operations/api-docs.routes.js';

export const app = express();

app.disable('x-powered-by');
// Render terminates TLS at its reverse proxy. Trust exactly that first proxy so
// secure protocol/IP detection and rate limiting do not treat every user alike.
if (env.nodeEnv === 'production') app.set('trust proxy', 1);
app.use(requestContext);
app.use(compression({ threshold: 1024 }));
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors(corsOptions));
app.use('/api/v1/payments/webhooks/stripe', express.raw({ type: 'application/json', limit: '200kb' }));
app.use('/api/v1/social-connections/webhooks/meta', express.raw({ type: 'application/json', limit: '200kb' }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser());
app.use(seoRouter);
app.use('/api-docs', apiDocsRouter);
// Infrastructure probes must not consume the public API rate-limit budget.
app.use('/api/v1/health', healthRouter);
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
