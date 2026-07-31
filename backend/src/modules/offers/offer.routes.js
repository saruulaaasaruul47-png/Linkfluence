import { Router } from 'express';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate } from '../auth/public.js';
import { offerController } from './offer.controller.js';
import { businessDecisionSchema, createOfferSchema, creatorResponseSchema, listOffersSchema, offerIdSchema } from './offer.schema.js';

export const offerRouter = Router();
offerRouter.use(authenticate);
offerRouter.get('/', validate(listOffersSchema), offerController.list);
offerRouter.post('/', validate(createOfferSchema), offerController.create);
offerRouter.get('/:id', validate(offerIdSchema), offerController.get);
offerRouter.post('/:id/respond', validate(creatorResponseSchema), offerController.creatorRespond);
offerRouter.post('/:id/decision', validate(businessDecisionSchema), offerController.businessDecide);
