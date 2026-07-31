import { Router } from 'express';
import { validate } from '../../shared/middleware/validate.js';
import { marketplaceController } from './marketplace.controller.js';
import {
  businessListSchema,
  categoriesSchema,
  creatorListSchema,
  publicProfileSchema,
} from './marketplace.schema.js';

export const creatorsRouter = Router();
creatorsRouter.get('/', validate(creatorListSchema), marketplaceController.creators);
creatorsRouter.get('/:id', validate(publicProfileSchema), marketplaceController.creator);

export const businessesRouter = Router();
businessesRouter.get('/', validate(businessListSchema), marketplaceController.businesses);
businessesRouter.get('/:id', validate(publicProfileSchema), marketplaceController.business);

export const categoriesRouter = Router();
categoriesRouter.get('/', validate(categoriesSchema), marketplaceController.categories);
