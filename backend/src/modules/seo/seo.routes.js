import { Router } from 'express';
import { seoController } from './seo.controller.js';

export const seoRouter = Router();
seoRouter.get('/sitemap.xml', seoController.sitemap);
seoRouter.get('/robots.txt', seoController.robots);
