import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { campaignService } from './campaign.service.js';

export const campaignController = {
  publicList: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Campaigns loaded.', await campaignService.listPublic(req.validated.query));
  }),
  ownerList: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Business campaigns loaded.', await campaignService.listOwned(req.user.id, req.validated.query));
  }),
  get: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Campaign loaded.', { campaign: await campaignService.get(req.validated.params.id, req.user?.id) });
  }),
  create: asyncHandler(async (req, res) => {
    sendSuccess(res, 201, 'Campaign draft created.', { campaign: await campaignService.create(req.user.id, req.validated.body) });
  }),
  update: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Campaign updated.', { campaign: await campaignService.update(req.user.id, req.validated.params.id, req.validated.body) });
  }),
  publish: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Campaign published.', {
      campaign: await campaignService.publish(
        req.user.id,
        req.validated.params.id,
        req.validated.body.isPublic,
      ),
    });
  }),
  pause: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Campaign paused.', { campaign: await campaignService.pause(req.user.id, req.validated.params.id) });
  }),
  archive: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Campaign archived.', { campaign: await campaignService.archive(req.user.id, req.validated.params.id) });
  }),
  remove: asyncHandler(async (req, res) => {
    await campaignService.remove(req.user.id, req.validated.params.id);
    sendSuccess(res, 200, 'Campaign draft deleted.', null);
  }),
  addAttachment: asyncHandler(async (req, res) => {
    sendSuccess(res, 201, 'Attachment added.', {
      campaign: await campaignService.addAttachment(req.user.id, req.validated.params.id, req.validated.body),
    });
  }),
  removeAttachment: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Attachment removed.', {
      campaign: await campaignService.removeAttachment(req.user.id, req.validated.params.id, req.validated.params.attachmentId),
    });
  }),
};
