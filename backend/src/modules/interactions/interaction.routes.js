import { Router } from 'express';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate } from '../auth/public.js';
import { optionalAuthenticate } from '../auth/public.js';
import { interactionController } from './interaction.controller.js';
import {
  libraryStateSchema,
  recentSchema,
  shareSchema,
  socialListSchema,
  socialSummarySchema,
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

export const publicInteractionRouter = Router();
publicInteractionRouter.get('/channels/:targetType/:targetId/social-summary', optionalAuthenticate, validate(socialSummarySchema), interactionController.summary);
publicInteractionRouter.get('/channels/:targetType/:targetId/followers', optionalAuthenticate, validate(socialListSchema), interactionController.followers);
publicInteractionRouter.get('/channels/:targetType/:targetId/following', optionalAuthenticate, validate(socialListSchema), interactionController.following);
