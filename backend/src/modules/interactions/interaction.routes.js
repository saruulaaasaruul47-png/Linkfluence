import { Router } from 'express';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate } from '../auth/public.js';
import { interactionController } from './interaction.controller.js';
import {
  libraryStateSchema,
  recentSchema,
  shareSchema,
  targetActionSchema,
} from './interaction.schema.js';

export const interactionRouter = Router();
interactionRouter.use(authenticate);
interactionRouter.get('/', validate(libraryStateSchema), interactionController.state);
interactionRouter.put('/saved/:targetType/:targetId', validate(targetActionSchema), interactionController.save);
interactionRouter.delete('/saved/:targetType/:targetId', validate(targetActionSchema), interactionController.unsave);
interactionRouter.put('/following/:targetType/:targetId', validate(targetActionSchema), interactionController.follow);
interactionRouter.delete('/following/:targetType/:targetId', validate(targetActionSchema), interactionController.unfollow);
interactionRouter.post('/recent', validate(recentSchema), interactionController.recent);
interactionRouter.post('/shares', validate(shareSchema), interactionController.share);
