import { Router } from 'express';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate } from '../auth/public.js';
import { creatorController } from './creator.controller.js';
import { createCreatorSchema, updateCreatorSchema } from './creator.schema.js';

export const creatorRouter = Router();
creatorRouter.use(authenticate);
creatorRouter.post('/profile', validate(createCreatorSchema), creatorController.create);
creatorRouter.get('/profile', creatorController.get);
creatorRouter.patch('/profile', validate(updateCreatorSchema), creatorController.update);
creatorRouter.delete('/profile', creatorController.remove);
