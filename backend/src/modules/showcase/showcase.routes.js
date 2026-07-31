import { Router } from 'express';
import { authorize } from '../../shared/middleware/authorize.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate, optionalAuthenticate } from '../auth/public.js';
import { showcaseController } from './showcase.controller.js';
import {
  createShowcaseSchema,
  showcaseIdSchema,
  showcaseListSchema,
  updateShowcaseSchema,
} from './showcase.schema.js';

export const showcaseRouter = Router();
showcaseRouter.get('/', validate(showcaseListSchema), showcaseController.list);
showcaseRouter.get('/following', authenticate, validate(showcaseListSchema), showcaseController.following);
showcaseRouter.get('/mine', authenticate, authorize('CREATOR'), validate(showcaseListSchema), showcaseController.mine);
showcaseRouter.post('/', authenticate, authorize('CREATOR'), validate(createShowcaseSchema), showcaseController.create);
showcaseRouter.put('/:id/reactions/like', authenticate, validate(showcaseIdSchema), showcaseController.like);
showcaseRouter.delete('/:id/reactions/like', authenticate, validate(showcaseIdSchema), showcaseController.unlike);
showcaseRouter.patch('/:id', authenticate, authorize('CREATOR'), validate(updateShowcaseSchema), showcaseController.update);
showcaseRouter.delete('/:id', authenticate, authorize('CREATOR'), validate(showcaseIdSchema), showcaseController.remove);
showcaseRouter.get('/:id', optionalAuthenticate, validate(showcaseIdSchema), showcaseController.get);
