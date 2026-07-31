import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { corsOptions } from './config/cors.js';
import { errorHandler } from './shared/errors/errorHandler.js';
import { notFoundHandler } from './shared/errors/notFoundHandler.js';
import { apiRouter } from './routes/index.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads'), {
  dotfiles: 'deny',
  index: false,
  maxAge: '7d',
}));
app.use('/api/v1', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
