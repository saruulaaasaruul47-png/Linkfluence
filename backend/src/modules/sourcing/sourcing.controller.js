import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { sourcingService } from './sourcing.service.js';

export const sourcingController = {
  shortlist: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Shortlist loaded.', { items: await sourcingService.listShortlist(req.user.id, req.validated.query.campaignId) })),
  addShortlist: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Creator shortlisted.', { item: await sourcingService.addShortlist(req.user.id, req.validated.params.creatorId, req.validated.body) })),
  removeShortlist: asyncHandler(async (req, res) => {
    await sourcingService.removeShortlist(req.user.id, req.validated.params.creatorId, req.validated.query.campaignId);
    sendSuccess(res, 200, 'Creator removed from shortlist.', null);
  }),
  compare: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Comparison loaded.', { items: await sourcingService.listCompare(req.user.id, req.validated.query.campaignId) })),
  addCompare: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Creator added to comparison.', { item: await sourcingService.addCompare(req.user.id, req.validated.params.creatorId, req.validated.body) })),
  removeCompare: asyncHandler(async (req, res) => {
    await sourcingService.removeCompare(req.user.id, req.validated.params.creatorId, req.validated.query.campaignId);
    sendSuccess(res, 200, 'Creator removed from comparison.', null);
  }),
  invite: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Creator invited.', { invitation: await sourcingService.invite(req.user.id, req.validated.body) })),
  businessInvitations: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Business invitations loaded.', await sourcingService.listBusinessInvitations(req.user.id, req.validated.query))),
  creatorInvitations: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Creator invitations loaded.', await sourcingService.listCreatorInvitations(req.user.id, req.validated.query))),
  respond: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Invitation response saved.', { invitation: await sourcingService.respond(req.user.id, req.validated.params.id, req.validated.body.action) })),
  cancel: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Invitation cancelled.', { invitation: await sourcingService.cancel(req.user.id, req.validated.params.id) })),
};
