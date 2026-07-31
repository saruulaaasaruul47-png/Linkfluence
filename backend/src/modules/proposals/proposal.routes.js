import { Router } from 'express';
import { authorize } from '../../shared/middleware/authorize.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate } from '../auth/public.js';
import { proposalController } from './proposal.controller.js';
import {
  createProposalSchema,
  proposalDecisionSchema,
  proposalIdSchema,
  proposalListSchema,
  updateProposalSchema,
} from './proposal.schema.js';

export const campaignProposalRouter = Router();
campaignProposalRouter.post('/:campaignId/proposals', authenticate, authorize('CREATOR'), validate(createProposalSchema), proposalController.create);

export const proposalRouter = Router();
proposalRouter.use(authenticate);
proposalRouter.get('/:id', validate(proposalIdSchema), proposalController.get);

export const creatorProposalRouter = Router();
creatorProposalRouter.use(authenticate, authorize('CREATOR'));
creatorProposalRouter.get('/', validate(proposalListSchema), proposalController.creatorList);
creatorProposalRouter.patch('/:id', validate(updateProposalSchema), proposalController.update);
creatorProposalRouter.post('/:id/withdraw', validate(proposalIdSchema), proposalController.withdraw);

export const businessProposalRouter = Router();
businessProposalRouter.use(authenticate, authorize('BUSINESS'));
businessProposalRouter.get('/', validate(proposalListSchema), proposalController.businessList);
businessProposalRouter.post('/:id/decision', validate(proposalDecisionSchema), proposalController.decide);
