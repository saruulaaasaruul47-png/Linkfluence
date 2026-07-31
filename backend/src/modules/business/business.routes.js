import { Router } from 'express';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate } from '../auth/public.js';
import { businessController } from './business.controller.js';
import { createBusinessSchema, updateBusinessSchema } from './business.schema.js';

export const businessRouter = Router();
businessRouter.use(authenticate);
businessRouter.post('/profile', validate(createBusinessSchema), businessController.create);
businessRouter.get('/profile', businessController.get);
businessRouter.patch('/profile', validate(updateBusinessSchema), businessController.update);
businessRouter.delete('/profile', businessController.remove);
