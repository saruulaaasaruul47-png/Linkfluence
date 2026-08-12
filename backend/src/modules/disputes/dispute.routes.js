import { Router } from 'express';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate } from '../auth/public.js';
import { disputeController } from './dispute.controller.js';
import { addEvidenceSchema, collaborationDisputeSchema, openDisputeSchema } from './dispute.schema.js';

export const collaborationDisputeRouter = Router();
collaborationDisputeRouter.use(authenticate);
collaborationDisputeRouter.get('/:collaborationId/disputes', validate(collaborationDisputeSchema), disputeController.list);
collaborationDisputeRouter.post('/:collaborationId/disputes', validate(openDisputeSchema), disputeController.open);

export const disputeRouter = Router();
disputeRouter.use(authenticate);
disputeRouter.post('/:id/evidence', validate(addEvidenceSchema), disputeController.evidence);

