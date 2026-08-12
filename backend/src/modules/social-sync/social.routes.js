import { Router } from 'express';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate } from '../auth/public.js';
import { socialController } from './social.controller.js';
import { authorizeSocialSchema, completeSelectionSchema, createManualSocialSchema, listSocialSchema, selectionOptionsSchema, socialAccountIdSchema, socialCallbackSchema, updateManualSocialSchema } from './social.schema.js';

export const socialConnectionRouter = Router();
socialConnectionRouter.get('/webhooks/meta', socialController.verifyMetaWebhook);
socialConnectionRouter.post('/webhooks/meta', socialController.receiveMetaWebhook);
socialConnectionRouter.get('/', authenticate, validate(listSocialSchema), socialController.list);
socialConnectionRouter.get('/selections/options', authenticate, validate(selectionOptionsSchema), socialController.selectionOptions);
socialConnectionRouter.post('/selections/complete', authenticate, validate(completeSelectionSchema), socialController.completeSelection);
socialConnectionRouter.post('/manual', authenticate, validate(createManualSocialSchema), socialController.createManual);
socialConnectionRouter.patch('/:id/manual', authenticate, validate(updateManualSocialSchema), socialController.updateManual);
socialConnectionRouter.delete('/:id', authenticate, validate(socialAccountIdSchema), socialController.disconnect);
socialConnectionRouter.get('/:provider/authorize', authenticate, validate(authorizeSocialSchema), socialController.authorize);
socialConnectionRouter.get('/:provider/callback', validate(socialCallbackSchema), socialController.callback);
socialConnectionRouter.post('/:id/sync', authenticate, validate(socialAccountIdSchema), socialController.sync);

export const creatorSocialRouter = Router();
creatorSocialRouter.use(authenticate);
creatorSocialRouter.get('/social-accounts', socialController.list);
creatorSocialRouter.post('/social-accounts', validate(createManualSocialSchema), socialController.createManual);
creatorSocialRouter.patch('/social-accounts/:id', validate(updateManualSocialSchema), socialController.updateManual);
creatorSocialRouter.delete('/social-accounts/:id', validate(socialAccountIdSchema), socialController.disconnect);
