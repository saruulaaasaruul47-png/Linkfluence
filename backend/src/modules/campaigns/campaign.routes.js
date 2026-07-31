import { Router } from 'express';
import { authorize } from '../../shared/middleware/authorize.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate, optionalAuthenticate } from '../auth/public.js';
import { campaignController } from './campaign.controller.js';
import {
  campaignIdSchema,
  createCampaignSchema,
  ownerCampaignListSchema,
  publishCampaignSchema,
  publicCampaignListSchema,
  updateCampaignSchema,
} from './campaign.schema.js';

export const campaignRouter = Router();
campaignRouter.get('/', validate(publicCampaignListSchema), campaignController.publicList);
campaignRouter.get('/:id', optionalAuthenticate, validate(campaignIdSchema), campaignController.get);

export const businessCampaignRouter = Router();
businessCampaignRouter.use(authenticate, authorize('BUSINESS'));
businessCampaignRouter.get('/', validate(ownerCampaignListSchema), campaignController.ownerList);
businessCampaignRouter.post('/', validate(createCampaignSchema), campaignController.create);
businessCampaignRouter.patch('/:id', validate(updateCampaignSchema), campaignController.update);
businessCampaignRouter.post('/:id/publish', validate(publishCampaignSchema), campaignController.publish);
businessCampaignRouter.post('/:id/pause', validate(campaignIdSchema), campaignController.pause);
businessCampaignRouter.post('/:id/archive', validate(campaignIdSchema), campaignController.archive);
businessCampaignRouter.delete('/:id', validate(campaignIdSchema), campaignController.remove);
