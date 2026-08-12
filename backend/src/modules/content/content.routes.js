import { Router } from 'express';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate, optionalAuthenticate } from '../auth/public.js';
import { contentController } from './content.controller.js';
import { channelPostsSchema, contentFeedSchema, contentIdSchema, createContentSchema, mineSchema, updateContentSchema } from './content.schema.js';

export const contentRouter = Router();

contentRouter.get('/feed', optionalAuthenticate, validate(contentFeedSchema), contentController.feed);
contentRouter.get('/channels/:authorType/:id/posts', optionalAuthenticate, validate(channelPostsSchema), contentController.channel);
contentRouter.get('/posts/mine', authenticate, validate(mineSchema), contentController.mine);
contentRouter.post('/posts', authenticate, validate(createContentSchema), contentController.create);
contentRouter.post('/posts/:id/publish', authenticate, validate(contentIdSchema), contentController.publish);
contentRouter.post('/posts/:id/archive', authenticate, validate(contentIdSchema), contentController.archive);
contentRouter.put('/posts/:id/like', authenticate, validate(contentIdSchema), contentController.like);
contentRouter.delete('/posts/:id/like', authenticate, validate(contentIdSchema), contentController.unlike);
contentRouter.patch('/posts/:id', authenticate, validate(updateContentSchema), contentController.update);
contentRouter.delete('/posts/:id', authenticate, validate(contentIdSchema), contentController.remove);
contentRouter.get('/posts/:id', optionalAuthenticate, validate(contentIdSchema), contentController.get);
