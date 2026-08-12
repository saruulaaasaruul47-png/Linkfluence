import asyncHandler from 'express-async-handler';
import { seoService } from './seo.service.js';

const cacheControl = 'public, max-age=300, stale-while-revalidate=3600';

export const seoController = {
  sitemap: asyncHandler(async (_req, res) => {
    res.set('Cache-Control', cacheControl);
    res.type('application/xml').status(200).send(await seoService.sitemap());
  }),
  robots: (_req, res) => {
    res.set('Cache-Control', cacheControl);
    res.type('text/plain').status(200).send(seoService.robots());
  },
};
