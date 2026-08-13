import { Router } from 'express';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate } from '../auth/public.js';
import { businessController } from './business.controller.js';
import {
  createBusinessSchema,
  inviteBusinessMemberSchema,
  updateBusinessMemberSchema,
  businessMemberIdSchema,
  updateBusinessSchema,
} from './business.schema.js';

export const businessRouter = Router();
businessRouter.use(authenticate);
businessRouter.post('/profile', validate(createBusinessSchema), businessController.create);
businessRouter.get('/profile', businessController.get);
businessRouter.patch('/profile', validate(updateBusinessSchema), businessController.update);
businessRouter.delete('/profile', businessController.remove);
businessRouter.get('/profile/members', businessController.listMembers);
businessRouter.post('/profile/members', validate(inviteBusinessMemberSchema), businessController.inviteMember);
businessRouter.post('/profile/members/:memberId/accept', validate(businessMemberIdSchema), businessController.acceptMember);
businessRouter.patch('/profile/members/:memberId', validate(updateBusinessMemberSchema), businessController.updateMember);
businessRouter.delete('/profile/members/:memberId', validate(businessMemberIdSchema), businessController.removeMember);
