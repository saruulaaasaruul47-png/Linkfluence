import { Router } from 'express';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate } from '../auth/public.js';
import { messagingController } from './messaging.controller.js';
import { conversationIdSchema, conversationListSchema, createConversationSchema, createMessageRequestSchema, messageDeleteSchema, messageListSchema, messageMutationSchema, messageRequestDecisionSchema, messageRequestListSchema, sendMessageSchema } from './messaging.schema.js';

export const messagingRouter = Router();
messagingRouter.use(authenticate);
messagingRouter.get('/', validate(conversationListSchema), messagingController.list);
messagingRouter.post('/', validate(createConversationSchema), messagingController.create);
messagingRouter.get('/requests', validate(messageRequestListSchema), messagingController.requests);
messagingRouter.post('/requests', validate(createMessageRequestSchema), messagingController.createRequest);
messagingRouter.post('/requests/:id/decision', validate(messageRequestDecisionSchema), messagingController.decideRequest);
messagingRouter.get('/:id/messages', validate(messageListSchema), messagingController.messages);
messagingRouter.post('/:id/messages', validate(sendMessageSchema), messagingController.send);
messagingRouter.patch('/:id/messages/:messageId', validate(messageMutationSchema), messagingController.edit);
messagingRouter.delete('/:id/messages/:messageId', validate(messageDeleteSchema), messagingController.remove);
messagingRouter.post('/:id/read', validate(conversationIdSchema), messagingController.read);
