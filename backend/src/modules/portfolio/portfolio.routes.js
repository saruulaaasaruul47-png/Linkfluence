import { Router } from 'express';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate } from '../auth/public.js';
import { portfolioController } from './portfolio.controller.js';
import {
  createPortfolioSchema,
  portfolioIdSchema,
  updatePortfolioSchema,
} from './portfolio.schema.js';

export const ownerPortfolioRouter = Router();
ownerPortfolioRouter.use(authenticate);
ownerPortfolioRouter.get('/', portfolioController.listMine);
ownerPortfolioRouter.post('/', validate(createPortfolioSchema), portfolioController.create);
ownerPortfolioRouter.patch('/:id', validate(updatePortfolioSchema), portfolioController.update);
ownerPortfolioRouter.delete('/:id', validate(portfolioIdSchema), portfolioController.remove);

export const publicPortfolioRouter = Router();
publicPortfolioRouter.get('/:id', validate(portfolioIdSchema), portfolioController.getPublic);
