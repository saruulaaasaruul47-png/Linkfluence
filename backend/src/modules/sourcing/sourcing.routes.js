import { Router } from 'express';
import { authorize } from '../../shared/middleware/authorize.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate } from '../auth/public.js';
import { sourcingController } from './sourcing.controller.js';
import {
  createInvitationSchema,
  invitationActionSchema,
  invitationIdSchema,
  invitationListSchema,
  sourcingDeleteSchema,
  sourcingListSchema,
  sourcingMutationSchema,
} from './sourcing.schema.js';

export const businessSourcingRouter = Router();
businessSourcingRouter.use(authenticate, authorize('BUSINESS'));
businessSourcingRouter.get('/shortlist', validate(sourcingListSchema), sourcingController.shortlist);
businessSourcingRouter.put('/shortlist/:creatorId', validate(sourcingMutationSchema), sourcingController.addShortlist);
businessSourcingRouter.delete('/shortlist/:creatorId', validate(sourcingDeleteSchema), sourcingController.removeShortlist);
businessSourcingRouter.get('/compare', validate(sourcingListSchema), sourcingController.compare);
businessSourcingRouter.put('/compare/:creatorId', validate(sourcingMutationSchema), sourcingController.addCompare);
businessSourcingRouter.delete('/compare/:creatorId', validate(sourcingDeleteSchema), sourcingController.removeCompare);
businessSourcingRouter.get('/invitations', validate(invitationListSchema), sourcingController.businessInvitations);
businessSourcingRouter.post('/invitations', validate(createInvitationSchema), sourcingController.invite);
businessSourcingRouter.post('/invitations/:id/cancel', validate(invitationIdSchema), sourcingController.cancel);

export const creatorInvitationRouter = Router();
creatorInvitationRouter.use(authenticate, authorize('CREATOR'));
creatorInvitationRouter.get('/', validate(invitationListSchema), sourcingController.creatorInvitations);
creatorInvitationRouter.post('/:id/respond', validate(invitationActionSchema), sourcingController.respond);
