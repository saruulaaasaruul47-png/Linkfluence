import { Router } from 'express';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate, optionalAuthenticate } from '../auth/public.js';
import { collectionController } from './collection.controller.js';
import {
  collectionDetailSchema,
  collectionIdSchema,
  collectionItemSchema,
  collectionItemDeleteSchema,
  collectionListSchema,
  createCollectionSchema,
  updateCollectionSchema,
} from './collection.schema.js';

export const collectionRouter = Router();
collectionRouter.get('/:id', optionalAuthenticate, validate(collectionDetailSchema), collectionController.get);
collectionRouter.use(authenticate);
collectionRouter.get('/', validate(collectionListSchema), collectionController.list);
collectionRouter.post('/', validate(createCollectionSchema), collectionController.create);
collectionRouter.patch('/:id', validate(updateCollectionSchema), collectionController.update);
collectionRouter.delete('/:id', validate(collectionIdSchema), collectionController.remove);
collectionRouter.put('/:id/items/:targetType/:targetId', validate(collectionItemSchema), collectionController.addItem);
collectionRouter.delete('/:id/items/:targetType/:targetId', validate(collectionItemDeleteSchema), collectionController.removeItem);
